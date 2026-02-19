import {
  describe,
  it,
  expect,
  render,
  waitFor,
  cleanup,
} from 'react-native-harness';
import { useEffect, useState, useCallback } from 'react';
import { Text, View } from 'react-native';
import {
  RiveFileFactory,
  useViewModelInstance,
  type RiveFile,
  type ViewModel,
  type ViewModelInstance,
} from '@rive-app/react-native';

const MULTI_AB = require('../assets/rive/arbtboards-models-instances.riv');
const DATABINDING = require('../assets/rive/databinding.riv');

function expectDefined<T>(value: T): asserts value is NonNullable<T> {
  expect(value).toBeDefined();
}

async function loadMultiAB() {
  return RiveFileFactory.fromSource(MULTI_AB, undefined);
}

async function loadDatabinding() {
  return RiveFileFactory.fromSource(DATABINDING, undefined);
}

// ── Helpers ──────────────────────────────────────────────────────────

type VMICtx = {
  instance: ViewModelInstance | null;
  instanceName: string | undefined;
  id: string | undefined;
  renderCount: number;
};

function createCtx(): VMICtx {
  return {
    instance: null,
    instanceName: undefined,
    id: undefined,
    renderCount: 0,
  };
}

// ── ViewModel source components ──────────────────────────────────────

function VMIFromViewModel({
  viewModel,
  name,
  useNew,
  ctx,
}: {
  viewModel: ViewModel | null;
  name?: string;
  useNew?: boolean;
  ctx: VMICtx;
}) {
  const instance = useViewModelInstance(viewModel, {
    ...(name != null && { name }),
    ...(useNew != null && { useNew }),
  });
  useEffect(() => {
    ctx.instance = instance;
    ctx.instanceName = instance?.instanceName;
    ctx.id = instance?.stringProperty('_id')?.value;
    ctx.renderCount++;
  }, [ctx, instance]);
  return (
    <View>
      <Text>{String(!!instance)}</Text>
    </View>
  );
}

// ── Param-change component (viewModelName changes via external trigger) ─

type ParamChangeCtx = {
  instance: ViewModelInstance | null;
  id: string | undefined;
  setViewModelName: ((name: string) => void) | null;
};

function createParamChangeCtx(): ParamChangeCtx {
  return { instance: null, id: undefined, setViewModelName: null };
}

function VMIWithParamChange({
  file,
  initialViewModelName,
  ctx,
}: {
  file: RiveFile;
  initialViewModelName: string;
  ctx: ParamChangeCtx;
}) {
  const [vmName, setVmName] = useState(initialViewModelName);
  const instance = useViewModelInstance(file, { viewModelName: vmName });

  const setViewModelName = useCallback((name: string) => {
    setVmName(name);
  }, []);

  useEffect(() => {
    ctx.instance = instance;
    ctx.id = instance?.stringProperty('_id')?.value;
    ctx.setViewModelName = setViewModelName;
  }, [ctx, instance, setViewModelName]);

  return (
    <View>
      <Text>{String(!!instance)}</Text>
    </View>
  );
}

// ── onInit-on-change component ────────────────────────────────────────

type OnInitChangeCtx = {
  instance: ViewModelInstance | null;
  initCalls: Array<{ vmName: string; id: string | undefined }>;
  setViewModelName: ((name: string) => void) | null;
};

function createOnInitChangeCtx(): OnInitChangeCtx {
  return { instance: null, initCalls: [], setViewModelName: null };
}

function VMIWithOnInitAndChange({
  file,
  initialViewModelName,
  ctx,
}: {
  file: RiveFile;
  initialViewModelName: string;
  ctx: OnInitChangeCtx;
}) {
  const [vmName, setVmName] = useState(initialViewModelName);
  const instance = useViewModelInstance(file, {
    viewModelName: vmName,
    onInit: (vmi) => {
      ctx.initCalls.push({
        vmName,
        id: vmi.stringProperty('_id')?.value,
      });
    },
  });

  const setViewModelName = useCallback((name: string) => {
    setVmName(name);
  }, []);

  useEffect(() => {
    ctx.instance = instance;
    ctx.setViewModelName = setViewModelName;
  }, [ctx, instance, setViewModelName]);

  return (
    <View>
      <Text>{String(!!instance)}</Text>
    </View>
  );
}

// ── ViewModel source tests ───────────────────────────────────────────

describe('useViewModelInstance from ViewModel source', () => {
  it('creates default instance from ViewModel', async () => {
    const file = await loadMultiAB();
    const vm = file.viewModelByName('viewmodel1');
    expectDefined(vm);

    const ctx = createCtx();
    await render(<VMIFromViewModel viewModel={vm} ctx={ctx} />);
    await waitFor(() => expect(ctx.instance).not.toBeNull(), { timeout: 5000 });
    expectDefined(ctx.id);
    expect(ctx.id).toBe('vm1.vmi.id');
    cleanup();
  });

  it('creates named instance from ViewModel', async () => {
    const file = await loadMultiAB();
    const vm = file.viewModelByName('viewmodel1');
    expectDefined(vm);

    const ctx = createCtx();
    await render(<VMIFromViewModel viewModel={vm} name="vmi2" ctx={ctx} />);
    await waitFor(() => expect(ctx.instance).not.toBeNull(), { timeout: 5000 });
    expect(ctx.instanceName).toBe('vmi2');
    expect(ctx.id).toBe('vm1.vmi2.id');
    cleanup();
  });

  it('creates blank instance from ViewModel with useNew', async () => {
    const file = await loadMultiAB();
    const vm = file.viewModelByName('viewmodel1');
    expectDefined(vm);

    const ctx = createCtx();
    await render(<VMIFromViewModel viewModel={vm} useNew={true} ctx={ctx} />);
    await waitFor(() => expect(ctx.instance).not.toBeNull(), { timeout: 5000 });
    // Blank instance should exist but have empty/default property values
    expectDefined(ctx.instance);
    cleanup();
  });

  it('returns null for non-existent named instance from ViewModel', async () => {
    const file = await loadMultiAB();
    const vm = file.viewModelByName('viewmodel1');
    expectDefined(vm);

    const ctx = createCtx();
    await render(
      <VMIFromViewModel viewModel={vm} name="doesNotExist" ctx={ctx} />
    );
    await new Promise((r) => setTimeout(r, 500));
    expect(ctx.instance).toBeNull();
    cleanup();
  });

  it('returns null when ViewModel source is null', async () => {
    const ctx = createCtx();
    await render(<VMIFromViewModel viewModel={null} ctx={ctx} />);
    await new Promise((r) => setTimeout(r, 500));
    expect(ctx.instance).toBeNull();
    cleanup();
  });
});

// ── Param change tests ───────────────────────────────────────────────

describe('useViewModelInstance param changes', () => {
  it('switches instance when viewModelName changes', async () => {
    const file = await loadMultiAB();
    const ctx = createParamChangeCtx();

    await render(
      <VMIWithParamChange
        file={file}
        initialViewModelName="viewmodel1"
        ctx={ctx}
      />
    );
    await waitFor(() => expect(ctx.instance).not.toBeNull(), { timeout: 5000 });
    expect(ctx.id).toBe('vm1.vmi.id');

    // Change to viewmodel2
    expectDefined(ctx.setViewModelName);
    ctx.setViewModelName('viewmodel2');
    await waitFor(() => expect(ctx.id).toBe('vm2.vmi1.id'), { timeout: 5000 });

    // Change to viewmodel3
    ctx.setViewModelName('viewmodel3');
    await waitFor(() => expect(ctx.id).toBe('vm3.vmi1.id'), { timeout: 5000 });

    cleanup();
  });

  it('returns null when viewModelName changes to non-existent', async () => {
    const file = await loadMultiAB();
    const ctx = createParamChangeCtx();

    await render(
      <VMIWithParamChange
        file={file}
        initialViewModelName="viewmodel1"
        ctx={ctx}
      />
    );
    await waitFor(() => expect(ctx.instance).not.toBeNull(), { timeout: 5000 });
    expect(ctx.id).toBe('vm1.vmi.id');

    expectDefined(ctx.setViewModelName);
    ctx.setViewModelName('nonExistent');
    await waitFor(() => expect(ctx.instance).toBeNull(), { timeout: 5000 });

    cleanup();
  });
});

// ── onInit on param change ───────────────────────────────────────────

describe('useViewModelInstance onInit on param change', () => {
  it('calls onInit for each new instance when viewModelName changes', async () => {
    const file = await loadMultiAB();
    const ctx = createOnInitChangeCtx();

    await render(
      <VMIWithOnInitAndChange
        file={file}
        initialViewModelName="viewmodel1"
        ctx={ctx}
      />
    );
    await waitFor(() => expect(ctx.instance).not.toBeNull(), { timeout: 5000 });
    expect(ctx.initCalls.length).toBeGreaterThanOrEqual(1);
    expect(ctx.initCalls[0]!.id).toBe('vm1.vmi.id');

    // Change to viewmodel2
    expectDefined(ctx.setViewModelName);
    const callCountBefore = ctx.initCalls.length;
    ctx.setViewModelName('viewmodel2');
    await waitFor(
      () => expect(ctx.initCalls.length).toBeGreaterThan(callCountBefore),
      { timeout: 5000 }
    );

    const lastCall = ctx.initCalls[ctx.initCalls.length - 1];
    expect(lastCall!.id).toBe('vm2.vmi1.id');

    cleanup();
  });
});

// ── databinding.riv: ViewModel source with number property ───────────

describe('useViewModelInstance from ViewModel with databinding.riv', () => {
  it('default instance has expected age property', async () => {
    const file = await loadDatabinding();
    const vm = file.defaultArtboardViewModel();
    expectDefined(vm);

    const ctx = createCtx();
    await render(<VMIFromViewModel viewModel={vm} ctx={ctx} />);
    await waitFor(() => expect(ctx.instance).not.toBeNull(), { timeout: 5000 });

    expectDefined(ctx.instance);
    const age = ctx.instance.numberProperty('age')?.value;
    expect(age).toBe(30);
    cleanup();
  });
});
