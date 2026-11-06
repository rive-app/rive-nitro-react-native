/* eslint-disable @typescript-eslint/no-deprecated -- real <Activity> needs a concurrent root, which only react-test-renderer offers here */
import {
  Activity,
  act,
  StrictMode,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  version,
  type ReactElement,
} from 'react';
import TestRenderer, { type ReactTestRenderer } from 'react-test-renderer';
import { RiveView } from '../../core/RiveView';
import type { RiveFile } from '../../specs/RiveFile.nitro';
import type { ViewModelInstance } from '../../specs/ViewModel.nitro';
import { useDisposableMemo } from '../useDisposableMemo';
import { useRiveFile } from '../useRiveFile';
import { useRiveList } from '../useRiveList';
import { useRiveNumber } from '../useRiveNumber';
import { useRiveTrigger } from '../useRiveTrigger';
import { useViewModelInstance } from '../useViewModelInstance';

jest.mock('react-native/Libraries/Image/Image', () => ({
  resolveAssetSource: jest.fn((source: number) => ({
    uri: `asset://resolved/${source}`,
  })),
}));

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// React before 19.3 skips insertion cleanups for deleted hidden subtrees.
const [major = 0, minor = 0] = version.split('.').map(Number);
const hiddenUnmountIsObservable = major > 19 || (major === 19 && minor >= 3);

type Resource = { label: string; dispose: jest.Mock };

function resource(label: string): Resource {
  return { label, dispose: jest.fn() };
}

async function mount(element: ReactElement): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(element, {
      unstable_isConcurrent: true,
    } as never);
  });
  return renderer!;
}

async function update(renderer: ReactTestRenderer, element: ReactElement) {
  await act(async () => renderer.update(element));
}

async function unmount(renderer: ReactTestRenderer) {
  await act(async () => renderer.unmount());
}

function Memo({ dep, seen }: { dep: string; seen: (r: Resource) => void }) {
  const value = useDisposableMemo(
    () => resource(dep),
    (r) => r.dispose(),
    [dep]
  );
  seen(value);
  return null;
}

function setup() {
  const created: Resource[] = [];
  const seen = (r: Resource) => {
    if (!created.includes(r)) created.push(r);
  };
  const tree = (mode: 'visible' | 'hidden', dep = 'A') => (
    <Activity mode={mode}>
      <Memo dep={dep} seen={seen} />
    </Activity>
  );
  return { created, tree };
}

const order: { calls: string[]; value?: Resource } = { calls: [] };

function OrderChild({ owner }: { owner: Resource }) {
  useLayoutEffect(
    () => () => {
      order.calls.push(`child layout: ${owner.dispose.mock.calls.length}`);
    },
    [owner]
  );
  return null;
}

function OrderOwner() {
  const value = useDisposableMemo(
    () => resource('A'),
    (r) => r.dispose(),
    []
  );
  order.value = value;
  return <OrderChild owner={value} />;
}

function OrderParent() {
  useEffect(
    () => () => {
      order.calls.push(
        `parent passive: ${order.value!.dispose.mock.calls.length}`
      );
    },
    []
  );
  return <OrderOwner />;
}

describe('useDisposableMemo under <Activity>', () => {
  it('keeps the value across hide and reveal', async () => {
    const { created, tree } = setup();
    const renderer = await mount(tree('visible'));
    await update(renderer, tree('hidden'));
    await update(renderer, tree('visible'));
    await update(renderer, tree('hidden'));
    await update(renderer, tree('visible'));
    expect(created).toHaveLength(1);
    expect(created[0]!.dispose).not.toHaveBeenCalled();
  });

  it('disposes exactly once when unmounted while visible, after a hide cycle', async () => {
    const { created, tree } = setup();
    const renderer = await mount(tree('visible'));
    await update(renderer, tree('hidden'));
    await update(renderer, tree('visible'));
    await unmount(renderer);
    expect(created[0]!.dispose).toHaveBeenCalledTimes(1);
  });

  it('releases on hide then unmount as far as React reports it', async () => {
    const { created, tree } = setup();
    const renderer = await mount(tree('visible'));
    await update(renderer, tree('hidden'));
    expect(created[0]!.dispose).not.toHaveBeenCalled();
    await unmount(renderer);
    expect(created[0]!.dispose).toHaveBeenCalledTimes(
      hiddenUnmountIsObservable ? 1 : 0
    );
  });

  it('releases a value that never became visible as far as React reports it', async () => {
    const { created, tree } = setup();
    const renderer = await mount(tree('hidden'));
    await unmount(renderer);
    expect(created[0]!.dispose).toHaveBeenCalledTimes(
      hiddenUnmountIsObservable ? 1 : 0
    );
  });

  it('replaces the value when deps change while hidden', async () => {
    const { created, tree } = setup();
    const renderer = await mount(tree('visible', 'A'));
    await update(renderer, tree('hidden', 'A'));
    await update(renderer, tree('hidden', 'B'));
    expect(created.map((r) => r.label)).toEqual(['A', 'B']);
    expect(created[0]!.dispose).toHaveBeenCalledTimes(1);
    await update(renderer, tree('visible', 'B'));
    expect(created[1]!.dispose).not.toHaveBeenCalled();
    await unmount(renderer);
    expect(created[0]!.dispose).toHaveBeenCalledTimes(1);
    expect(created[1]!.dispose).toHaveBeenCalledTimes(1);
  });

  it('survives Strict Mode and nested Activity', async () => {
    const created: Resource[] = [];
    const seen = (r: Resource) => {
      if (!created.includes(r)) created.push(r);
    };
    const tree = (outer: 'visible' | 'hidden', inner: 'visible' | 'hidden') => (
      <StrictMode>
        <Activity mode={outer}>
          <Activity mode={inner}>
            <Memo dep="A" seen={seen} />
          </Activity>
        </Activity>
      </StrictMode>
    );
    const renderer = await mount(tree('visible', 'visible'));
    await update(renderer, tree('visible', 'hidden'));
    await update(renderer, tree('hidden', 'hidden'));
    await update(renderer, tree('hidden', 'visible'));
    await update(renderer, tree('visible', 'visible'));
    const live = created[created.length - 1]!;
    expect(live.dispose).not.toHaveBeenCalled();
    await unmount(renderer);
    expect(live.dispose).toHaveBeenCalledTimes(1);
  });

  it('keeps the value when Suspense hides the tree', async () => {
    const created: Resource[] = [];
    const seen = (r: Resource) => {
      if (!created.includes(r)) created.push(r);
    };
    let resolve = () => {};
    const pending = new Promise<void>((r) => (resolve = r));
    let suspended = false;
    const Gate = () => {
      if (suspended) throw pending;
      return null;
    };
    const tree = () => (
      <Suspense fallback={null}>
        <Memo dep="A" seen={seen} />
        <Gate />
      </Suspense>
    );
    const renderer = await mount(tree());
    suspended = true;
    await update(renderer, tree());
    expect(created[0]!.dispose).not.toHaveBeenCalled();
    suspended = false;
    resolve();
    await update(renderer, tree());
    expect(created[0]!.dispose).not.toHaveBeenCalled();
    await unmount(renderer);
    expect(created[0]!.dispose).toHaveBeenCalledTimes(1);
  });

  it('releases a Suspense-hidden tree on unmount as far as React reports it', async () => {
    const created: Resource[] = [];
    const seen = (r: Resource) => {
      if (!created.includes(r)) created.push(r);
    };
    let suspended = false;
    const pending = new Promise<void>(() => {});
    const Gate = () => {
      if (suspended) throw pending;
      return null;
    };
    const tree = () => (
      <Suspense fallback={null}>
        <Memo dep="A" seen={seen} />
        <Gate />
      </Suspense>
    );
    const renderer = await mount(tree());
    suspended = true;
    await update(renderer, tree());
    await unmount(renderer);
    expect(created[0]!.dispose).toHaveBeenCalledTimes(
      hiddenUnmountIsObservable ? 1 : 0
    );
  });

  it('leaves the value alive for every layout cleanup and for the passive cleanup of a parent', async () => {
    const renderer = await mount(<OrderParent />);
    await unmount(renderer);
    expect(order.calls).toEqual(['child layout: 0', 'parent passive: 0']);
    expect(order.value!.dispose).toHaveBeenCalledTimes(1);
  });

  it('never disposes a value from a render that did not commit', async () => {
    const created: Resource[] = [];
    const seen = (r: Resource) => {
      if (!created.includes(r)) created.push(r);
    };
    const pending = new Promise<void>(() => {});
    const Never = (): null => {
      throw pending;
    };
    const renderer = await mount(
      <Suspense fallback={null}>
        <Memo dep="A" seen={seen} />
        <Never />
      </Suspense>
    );
    await unmount(renderer);
    expect(created.length).toBeGreaterThan(0);
    created.forEach((r) => expect(r.dispose).not.toHaveBeenCalled());
  });
});

describe('the setTimeout(0) deferral proposed in #448', () => {
  function useDeferredDispose() {
    const value = useRef(resource('A'));
    const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
      if (pending.current !== null) clearTimeout(pending.current);
      pending.current = null;
      const current = value.current;
      return () => {
        pending.current = setTimeout(() => current.dispose(), 0);
      };
    }, []);
    return value.current;
  }

  it('disposes a hidden value, because the timer fires before the reveal', async () => {
    jest.useFakeTimers();
    let value: Resource | undefined;
    const Deferred = () => {
      value = useDeferredDispose();
      return null;
    };
    const tree = (mode: 'visible' | 'hidden') => (
      <Activity mode={mode}>
        <Deferred />
      </Activity>
    );
    const renderer = await mount(tree('visible'));
    await update(renderer, tree('hidden'));
    act(() => {
      jest.advanceTimersByTime(1);
    });
    await update(renderer, tree('visible'));
    expect(value!.dispose).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
    await unmount(renderer);
  });
});

function nativeLike<T extends object>(extra: T) {
  return { dispose: jest.fn(), ...extra };
}

describe('useRiveFile under <Activity>', () => {
  const factory = (global as any).mockRiveFileFactory;

  function setupFile() {
    const results: ReturnType<typeof useRiveFile>[] = [];
    const Loader = ({ uri }: { uri: string }) => {
      results.push(useRiveFile({ uri }));
      return null;
    };
    const tree = (mode: 'visible' | 'hidden', uri = 'https://x/a.riv') => (
      <Activity mode={mode}>
        <Loader uri={uri} />
      </Activity>
    );
    const latest = () => results[results.length - 1]!;
    return { tree, latest };
  }

  beforeEach(() => jest.clearAllMocks());

  it('neither disposes nor reloads across hide and reveal', async () => {
    const file = nativeLike({});
    factory.fromURL.mockResolvedValue(file);
    const { tree, latest } = setupFile();
    const renderer = await mount(tree('visible'));
    await update(renderer, tree('hidden'));
    await update(renderer, tree('visible'));
    expect(factory.fromURL).toHaveBeenCalledTimes(1);
    expect(file.dispose).not.toHaveBeenCalled();
    expect(latest().riveFile).toBe(file);
    await unmount(renderer);
    expect(file.dispose).toHaveBeenCalledTimes(1);
  });

  it('keeps a load that is in flight when the tree hides', async () => {
    const file = nativeLike({});
    let finish: (f: unknown) => void = () => {};
    factory.fromURL.mockImplementation(
      () => new Promise((resolve) => (finish = resolve))
    );
    const { tree, latest } = setupFile();
    const renderer = await mount(tree('visible'));
    await update(renderer, tree('hidden'));
    await act(async () => finish(file));
    await update(renderer, tree('visible'));
    expect(factory.fromURL).toHaveBeenCalledTimes(1);
    expect(file.dispose).not.toHaveBeenCalled();
    expect(latest().riveFile).toBe(file);
    await unmount(renderer);
  });

  it('loads the new input on reveal when it changed while hidden', async () => {
    const first = nativeLike({});
    const second = nativeLike({});
    factory.fromURL.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const { tree, latest } = setupFile();
    const renderer = await mount(tree('visible', 'https://x/a.riv'));
    await update(renderer, tree('hidden', 'https://x/a.riv'));
    await update(renderer, tree('hidden', 'https://x/b.riv'));
    await update(renderer, tree('visible', 'https://x/b.riv'));
    expect(first.dispose).toHaveBeenCalledTimes(1);
    expect(latest().riveFile).toBe(second);
    await unmount(renderer);
    expect(second.dispose).toHaveBeenCalledTimes(1);
  });
});

describe('useViewModelInstance({ async: true }) under <Activity>', () => {
  it('keeps the instance and the values set on it', async () => {
    const instance = nativeLike({ age: 0 });
    const viewModel = nativeLike({
      createDefaultInstanceAsync: jest.fn(async () => instance),
    });
    const file = {
      defaultArtboardViewModelAsync: jest.fn(async () => viewModel),
    } as unknown as RiveFile;
    const seen: unknown[] = [];
    const Vmi = () => {
      seen.push(useViewModelInstance(file, { async: true }).instance);
      return null;
    };
    const tree = (mode: 'visible' | 'hidden') => (
      <Activity mode={mode}>
        <Vmi />
      </Activity>
    );
    const renderer = await mount(tree('visible'));
    await update(renderer, tree('hidden'));
    await update(renderer, tree('visible'));
    expect(viewModel.createDefaultInstanceAsync).toHaveBeenCalledTimes(1);
    expect(instance.dispose).not.toHaveBeenCalled();
    expect(seen[seen.length - 1]).toBe(instance);
    await unmount(renderer);
    expect(instance.dispose).toHaveBeenCalledTimes(1);
  });
});

describe('property hooks under <Activity>', () => {
  function makeProperty() {
    const removeListener = jest.fn();
    return nativeLike({
      addListener: jest.fn(() => removeListener),
      getValueAsync: jest.fn(async () => 1),
      getLengthAsync: jest.fn(async () => 0),
      set: jest.fn(),
      trigger: jest.fn(),
      removeListener,
    });
  }

  it.each([
    ['useRiveNumber', 'numberProperty'],
    ['useRiveTrigger', 'triggerProperty'],
    ['useRiveList', 'listProperty'],
  ])(
    '%s keeps the property and resubscribes on reveal',
    async (hook, accessor) => {
      const property = makeProperty();
      const instance = {
        [accessor]: jest.fn(() => property),
      } as unknown as ViewModelInstance;
      const Consumer = () => {
        /* eslint-disable react-hooks/rules-of-hooks */
        if (hook === 'useRiveNumber') useRiveNumber('p', instance);
        else if (hook === 'useRiveTrigger') useRiveTrigger('p', instance);
        else useRiveList('p', instance);
        /* eslint-enable react-hooks/rules-of-hooks */
        return null;
      };
      const tree = (mode: 'visible' | 'hidden') => (
        <Activity mode={mode}>
          <Consumer />
        </Activity>
      );
      const renderer = await mount(tree('visible'));
      await update(renderer, tree('hidden'));
      expect(property.removeListener).toHaveBeenCalledTimes(1);
      expect(property.dispose).not.toHaveBeenCalled();
      await update(renderer, tree('visible'));
      expect(property.addListener).toHaveBeenCalledTimes(2);
      expect(property.dispose).not.toHaveBeenCalled();
      await unmount(renderer);
      expect(property.dispose).toHaveBeenCalledTimes(1);
    }
  );
});

describe('RiveView under <Activity>', () => {
  it('keeps the view methods across hide and reveal, and disposes on unmount', async () => {
    const view = Object.create(
      { play: jest.fn(), pause: jest.fn() },
      { dispose: { value: jest.fn(), configurable: true } }
    );
    const tree = (mode: 'visible' | 'hidden') => (
      <Activity mode={mode}>
        <RiveView
          file={{} as RiveFile}
          dataBind={{} as ViewModelInstance}
          hybridRef={{ f: () => {} }}
        />
      </Activity>
    );
    const renderer = await mount(tree('visible'));
    const host = renderer.root.findByType('RiveView' as never);
    await act(async () => host.props.hybridRef.f(view));
    await update(renderer, tree('hidden'));
    await update(renderer, tree('visible'));
    expect(typeof view.play).toBe('function');
    expect(view.dispose).not.toHaveBeenCalled();
    await unmount(renderer);
    expect(view.play).toBeUndefined();
    expect(view.dispose).toHaveBeenCalledTimes(1);
  });
});
