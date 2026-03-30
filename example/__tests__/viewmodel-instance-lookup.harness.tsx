import {
  describe,
  it,
  expect,
  render,
  waitFor,
  cleanup,
} from 'react-native-harness';
import { useEffect } from 'react';
import { Platform, Text, View } from 'react-native';
import {
  RiveFileFactory,
  ArtboardByName,
  useViewModelInstance,
  type RiveFile,
} from '@rive-app/react-native';
import type { ViewModelInstance } from '@rive-app/react-native';

// rive-android experimental SDK doesn't expose the ViewModel name from
// DefaultForArtboard yet — pending rive-app/rive-android#443 which adds
// getDefaultViewModelInfo(). Once merged and released, remove these guards.
const isAndroidExperimental =
  Platform.OS === 'android' && RiveFileFactory.getBackend() === 'experimental';

const MULTI_AB = require('../assets/rive/arbtboards-models-instances.riv');

function expectDefined<T>(value: T): asserts value is NonNullable<T> {
  expect(value).toBeDefined();
}

async function loadFile() {
  return RiveFileFactory.fromSource(MULTI_AB, undefined);
}

// ── Direct API tests ────────────────────────────────────────────────

describe('Multi-artboard file: direct API', () => {
  it('has 4 artboards', async () => {
    const file = await loadFile();
    expect(file.artboardCount).toBe(4);
    expect(file.artboardNames).toContain('artboard1');
    expect(file.artboardNames).toContain('artboard2');
    expect(file.artboardNames).toContain('artboard3');
  });

  it('has 3 viewmodels', async () => {
    const file = await loadFile();
    expect(file.viewModelCount).toBe(3);
  });

  it('viewModelByName finds each model', async () => {
    const file = await loadFile();
    for (const name of ['viewmodel1', 'viewmodel2', 'viewmodel3']) {
      const vm = file.viewModelByName(name);
      expectDefined(vm);
      expect(vm.modelName).toBe(name);
    }
  });

  it('viewModelByName returns undefined for non-existent', async () => {
    const file = await loadFile();
    expect(file.viewModelByName('nope')).toBeUndefined();
  });

  it('viewmodel1 has non-zero propertyCount and instanceCount', async () => {
    const file = await loadFile();
    const vm = file.viewModelByName('viewmodel1');
    expectDefined(vm);
    expect(vm.propertyCount).toBeGreaterThan(0);
    expect(vm.instanceCount).toBe(3);
  });

  it('defaultArtboardViewModel maps artboard1 → viewmodel1', async () => {
    const file = await loadFile();
    const vm = file.defaultArtboardViewModel(ArtboardByName('artboard1'));
    expectDefined(vm);
    if (!isAndroidExperimental) {
      expect(vm.modelName).toBe('viewmodel1');
    }
  });

  it('defaultArtboardViewModel maps artboard2 → viewmodel2', async () => {
    const file = await loadFile();
    const vm = file.defaultArtboardViewModel(ArtboardByName('artboard2'));
    expectDefined(vm);
    if (!isAndroidExperimental) {
      expect(vm.modelName).toBe('viewmodel2');
    }
  });

  it('defaultArtboardViewModel maps artboard3 → viewmodel3', async () => {
    const file = await loadFile();
    const vm = file.defaultArtboardViewModel(ArtboardByName('artboard3'));
    expectDefined(vm);
    if (!isAndroidExperimental) {
      expect(vm.modelName).toBe('viewmodel3');
    }
  });

  it('default artboard VM (no arg) is viewmodel1', async () => {
    const file = await loadFile();
    const vm = file.defaultArtboardViewModel();
    expectDefined(vm);
    if (!isAndroidExperimental) {
      expect(vm.modelName).toBe('viewmodel1');
    }
  });
});

// ── useViewModelInstance hook tests with _id verification ───────────

type VMIContext = {
  instance: ViewModelInstance | null;
  instanceName: string | undefined;
  id: string | undefined;
};

function createCtx(): VMIContext {
  return { instance: null, instanceName: undefined, id: undefined };
}

function VMIByViewModelName({
  file,
  viewModelName,
  instanceName,
  ctx,
}: {
  file: RiveFile;
  viewModelName: string;
  instanceName?: string;
  ctx: VMIContext;
}) {
  const { instance } = useViewModelInstance(file, {
    viewModelName,
    ...(instanceName != null && { instanceName }),
  });
  useEffect(() => {
    ctx.instance = instance ?? null;
    ctx.instanceName = instance?.instanceName;
    ctx.id = instance?.stringProperty('_id')?.value;
  }, [ctx, instance]);
  return (
    <View>
      <Text>{String(!!instance)}</Text>
    </View>
  );
}

function VMIByArtboardName({
  file,
  artboardName,
  ctx,
}: {
  file: RiveFile;
  artboardName: string;
  ctx: VMIContext;
}) {
  const { instance } = useViewModelInstance(file, { artboardName });
  useEffect(() => {
    ctx.instance = instance ?? null;
    ctx.instanceName = instance?.instanceName;
    ctx.id = instance?.stringProperty('_id')?.value;
  }, [ctx, instance]);
  return (
    <View>
      <Text>{String(!!instance)}</Text>
    </View>
  );
}

function VMIDefault({ file, ctx }: { file: RiveFile; ctx: VMIContext }) {
  const { instance } = useViewModelInstance(file);
  useEffect(() => {
    ctx.instance = instance ?? null;
    ctx.instanceName = instance?.instanceName;
    ctx.id = instance?.stringProperty('_id')?.value;
  }, [ctx, instance]);
  return (
    <View>
      <Text>{String(!!instance)}</Text>
    </View>
  );
}

function VMIWithOnInit({
  file,
  viewModelName,
  ctx,
  initResult,
}: {
  file: RiveFile;
  viewModelName: string;
  ctx: VMIContext;
  initResult: { called: boolean; id: string | undefined };
}) {
  const { instance } = useViewModelInstance(file, {
    viewModelName,
    onInit: (vmi) => {
      initResult.called = true;
      initResult.id = vmi.stringProperty('_id')?.value;
    },
  });
  useEffect(() => {
    ctx.instance = instance ?? null;
    ctx.instanceName = instance?.instanceName;
    ctx.id = instance?.stringProperty('_id')?.value;
  }, [ctx, instance]);
  return (
    <View>
      <Text>{String(!!instance)}</Text>
    </View>
  );
}

// ── By viewModelName ────────────────────────────────────────────────

describe('useViewModelInstance by viewModelName verifies _id', () => {
  it('viewModelName="viewmodel1" → _id="vm1.vmi.id"', async () => {
    const file = await loadFile();
    const ctx = createCtx();
    await render(
      <VMIByViewModelName file={file} viewModelName="viewmodel1" ctx={ctx} />
    );
    await waitFor(() => expect(ctx.instance).not.toBeNull(), { timeout: 5000 });
    expect(ctx.id).toBe('vm1.vmi.id');
    cleanup();
  });

  it('viewModelName="viewmodel2" → _id="vm2.vmi1.id"', async () => {
    const file = await loadFile();
    const ctx = createCtx();
    await render(
      <VMIByViewModelName file={file} viewModelName="viewmodel2" ctx={ctx} />
    );
    await waitFor(() => expect(ctx.instance).not.toBeNull(), { timeout: 5000 });
    expect(ctx.id).toBe('vm2.vmi1.id');
    cleanup();
  });

  it('viewModelName="viewmodel3" → _id="vm3.vmi1.id"', async () => {
    const file = await loadFile();
    const ctx = createCtx();
    await render(
      <VMIByViewModelName file={file} viewModelName="viewmodel3" ctx={ctx} />
    );
    await waitFor(() => expect(ctx.instance).not.toBeNull(), { timeout: 5000 });
    expect(ctx.id).toBe('vm3.vmi1.id');
    cleanup();
  });

  it('non-existent viewModelName returns null', async () => {
    const file = await loadFile();
    const ctx = createCtx();
    await render(
      <VMIByViewModelName file={file} viewModelName="nope" ctx={ctx} />
    );
    await new Promise((r) => setTimeout(r, 500));
    expect(ctx.instance).toBeNull();
    cleanup();
  });
});

// ── By viewModelName + instanceName ─────────────────────────────────

describe('useViewModelInstance by viewModelName + instanceName verifies _id', () => {
  it('viewmodel1 + vmi1 → _id="vm1.vmi1.id"', async () => {
    const file = await loadFile();
    const ctx = createCtx();
    await render(
      <VMIByViewModelName
        file={file}
        viewModelName="viewmodel1"
        instanceName="vmi1"
        ctx={ctx}
      />
    );
    await waitFor(() => expect(ctx.instance).not.toBeNull(), { timeout: 5000 });
    expect(ctx.id).toBe('vm1.vmi1.id');
    expect(ctx.instanceName).toBe('vmi1');
    cleanup();
  });

  it('viewmodel1 + vmi2 → _id="vm1.vmi2.id"', async () => {
    const file = await loadFile();
    const ctx = createCtx();
    await render(
      <VMIByViewModelName
        file={file}
        viewModelName="viewmodel1"
        instanceName="vmi2"
        ctx={ctx}
      />
    );
    await waitFor(() => expect(ctx.instance).not.toBeNull(), { timeout: 5000 });
    expect(ctx.id).toBe('vm1.vmi2.id');
    expect(ctx.instanceName).toBe('vmi2');
    cleanup();
  });

  it('viewmodel2 + vmi2 → _id="vm2.vmi2.id"', async () => {
    const file = await loadFile();
    const ctx = createCtx();
    await render(
      <VMIByViewModelName
        file={file}
        viewModelName="viewmodel2"
        instanceName="vmi2"
        ctx={ctx}
      />
    );
    await waitFor(() => expect(ctx.instance).not.toBeNull(), { timeout: 5000 });
    expect(ctx.id).toBe('vm2.vmi2.id');
    expect(ctx.instanceName).toBe('vmi2');
    cleanup();
  });

  it('viewmodel3 + vmi1 → _id="vm3.vmi1.id"', async () => {
    const file = await loadFile();
    const ctx = createCtx();
    await render(
      <VMIByViewModelName
        file={file}
        viewModelName="viewmodel3"
        instanceName="vmi1"
        ctx={ctx}
      />
    );
    await waitFor(() => expect(ctx.instance).not.toBeNull(), { timeout: 5000 });
    expect(ctx.id).toBe('vm3.vmi1.id');
    expect(ctx.instanceName).toBe('vmi1');
    cleanup();
  });

  it('non-existent instanceName returns null', async () => {
    const file = await loadFile();
    const ctx = createCtx();
    await render(
      <VMIByViewModelName
        file={file}
        viewModelName="viewmodel1"
        instanceName="doesNotExist"
        ctx={ctx}
      />
    );
    await new Promise((r) => setTimeout(r, 500));
    expect(ctx.instance).toBeNull();
    cleanup();
  });
});

// ── By artboardName ─────────────────────────────────────────────────

describe('useViewModelInstance by artboardName verifies _id', () => {
  it('artboardName="artboard1" → _id="vm1.vmi.id"', async () => {
    const file = await loadFile();
    const ctx = createCtx();
    await render(
      <VMIByArtboardName file={file} artboardName="artboard1" ctx={ctx} />
    );
    await waitFor(() => expect(ctx.instance).not.toBeNull(), { timeout: 5000 });
    expect(ctx.id).toBe('vm1.vmi.id');
    cleanup();
  });

  it('artboardName="artboard2" → _id="vm2.vmi1.id"', async () => {
    const file = await loadFile();
    const ctx = createCtx();
    await render(
      <VMIByArtboardName file={file} artboardName="artboard2" ctx={ctx} />
    );
    await waitFor(() => expect(ctx.instance).not.toBeNull(), { timeout: 5000 });
    expect(ctx.id).toBe('vm2.vmi1.id');
    cleanup();
  });

  it('artboardName="artboard3" → _id="vm3.vmi1.id"', async () => {
    const file = await loadFile();
    const ctx = createCtx();
    await render(
      <VMIByArtboardName file={file} artboardName="artboard3" ctx={ctx} />
    );
    await waitFor(() => expect(ctx.instance).not.toBeNull(), { timeout: 5000 });
    expect(ctx.id).toBe('vm3.vmi1.id');
    cleanup();
  });
});

// ── Default (no params) ─────────────────────────────────────────────

describe('useViewModelInstance default verifies _id', () => {
  it('default → _id="vm1.vmi.id" (artboard1/viewmodel1)', async () => {
    const file = await loadFile();
    const ctx = createCtx();
    await render(<VMIDefault file={file} ctx={ctx} />);
    await waitFor(() => expect(ctx.instance).not.toBeNull(), { timeout: 5000 });
    expect(ctx.id).toBe('vm1.vmi.id');
    cleanup();
  });
});

// ── createInstanceByIndex (deprecated sync compat layer) ─────────────

describe('createInstanceByIndex respects the index', () => {
  it('index 0 and index 1 return different instances (not both the default)', async () => {
    const file = await loadFile();
    const vm = file.viewModelByName('viewmodel1');
    expectDefined(vm);

    const instance0 = vm.createInstanceByIndex(0);
    const instance1 = vm.createInstanceByIndex(1);
    expectDefined(instance0);
    expectDefined(instance1);

    const id0 = instance0.stringProperty('_id')?.value;
    const id1 = instance1.stringProperty('_id')?.value;

    expect(id0).not.toBe(id1);
  });

  it('index 0 returns the first named instance ("vmi", _id=vm1.vmi.id)', async () => {
    const file = await loadFile();
    const vm = file.viewModelByName('viewmodel1');
    expectDefined(vm);

    const instance = vm.createInstanceByIndex(0);
    expectDefined(instance);

    expect(instance.instanceName).toBe('vmi');
    expect(instance.stringProperty('_id')?.value).toBe('vm1.vmi.id');
  });

  it('index 1 returns the second named instance (vmi2)', async () => {
    const file = await loadFile();
    const vm = file.viewModelByName('viewmodel1');
    expectDefined(vm);

    const instance = vm.createInstanceByIndex(1);
    expectDefined(instance);

    const id = instance.stringProperty('_id')?.value;
    expect(id).toBe('vm1.vmi2.id');
  });

  it('out-of-bounds index returns undefined', async () => {
    const file = await loadFile();
    const vm = file.viewModelByName('viewmodel1');
    expectDefined(vm);

    const instance = vm.createInstanceByIndex(99);
    expect(instance).toBeUndefined();
  });
});

// ── onInit receives correct instance ────────────────────────────────

describe('useViewModelInstance onInit verifies _id', () => {
  it('onInit for viewmodel2 receives _id="vm2.vmi1.id"', async () => {
    const file = await loadFile();
    const ctx = createCtx();
    const initResult = { called: false, id: undefined as string | undefined };
    await render(
      <VMIWithOnInit
        file={file}
        viewModelName="viewmodel2"
        ctx={ctx}
        initResult={initResult}
      />
    );
    await waitFor(() => expect(ctx.instance).not.toBeNull(), { timeout: 5000 });
    expect(initResult.called).toBe(true);
    expect(initResult.id).toBe('vm2.vmi1.id');
    cleanup();
  });

  it('onInit for viewmodel3 receives _id="vm3.vmi1.id"', async () => {
    const file = await loadFile();
    const ctx = createCtx();
    const initResult = { called: false, id: undefined as string | undefined };
    await render(
      <VMIWithOnInit
        file={file}
        viewModelName="viewmodel3"
        ctx={ctx}
        initResult={initResult}
      />
    );
    await waitFor(() => expect(ctx.instance).not.toBeNull(), { timeout: 5000 });
    expect(initResult.called).toBe(true);
    expect(initResult.id).toBe('vm3.vmi1.id');
    cleanup();
  });
});
