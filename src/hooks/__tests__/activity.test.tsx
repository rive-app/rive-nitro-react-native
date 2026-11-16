/* eslint-disable @typescript-eslint/no-deprecated -- real <Activity> needs a concurrent root, which only react-test-renderer offers here */
import {
  Activity,
  act,
  startTransition,
  StrictMode,
  Suspense,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
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
    uri: `asset://${source}`,
  })),
}));

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

type Mode = 'visible' | 'hidden';
type Resource = { label: string; dispose: jest.Mock };
const resource = (label: string): Resource => ({ label, dispose: jest.fn() });
const nativeLike = <T extends object>(extra: T) => ({
  dispose: jest.fn(),
  ...extra,
});

let renderer: ReactTestRenderer;
async function render(element: ReactElement) {
  await act(async () => {
    if (renderer) renderer.update(element);
    else
      renderer = TestRenderer.create(element, {
        unstable_isConcurrent: true,
      } as never);
  });
}
async function unmount() {
  await act(async () => renderer.unmount());
}
beforeEach(() => {
  renderer = undefined as never;
  jest.clearAllMocks();
});

let created: Resource[] = [];
beforeEach(() => (created = []));
function useResource(dep: string) {
  const value = useDisposableMemo(
    () => resource(dep),
    (r) => r.dispose(),
    [dep]
  );
  if (!created.includes(value)) created.push(value);
  return value;
}
function Memo({ dep = 'A' }: { dep?: string }) {
  useResource(dep);
  return null;
}

const activity = (mode: Mode, node: ReactNode) => (
  <Activity mode={mode}>{node}</Activity>
);
async function hideAndReveal(node: ReactNode) {
  for (const mode of ['visible', 'hidden', 'visible'] as const) {
    await render(activity(mode, node));
  }
}

describe('useDisposableMemo', () => {
  it('keeps the value across hide and reveal, and disposes it once on unmount', async () => {
    await hideAndReveal(<Memo />);
    await hideAndReveal(<Memo />);
    expect(created).toHaveLength(1);
    expect(created[0]!.dispose).not.toHaveBeenCalled();
    await unmount();
    expect(created[0]!.dispose).toHaveBeenCalledTimes(1);
  });

  it('keeps the value under Strict Mode and when Suspense hides the tree', async () => {
    let suspended = false;
    let resolve = () => {};
    const pending = new Promise<void>((r) => (resolve = r));
    const Gate = () => {
      if (suspended) throw pending;
      return null;
    };
    const tree = (mode: Mode) => (
      <StrictMode>
        <Suspense fallback={null}>
          {activity(mode, <Memo />)}
          <Gate />
        </Suspense>
      </StrictMode>
    );
    await render(tree('visible'));
    await render(tree('hidden'));
    await render(tree('visible'));
    suspended = true;
    await render(tree('visible'));
    suspended = false;
    await act(async () => resolve());
    const live = created[created.length - 1]!;
    expect(live.dispose).not.toHaveBeenCalled();
    await unmount();
    expect(live.dispose).toHaveBeenCalledTimes(1);
  });

  it("frees a replaced or unmounted value after its child's passive cleanup (#407)", async () => {
    const log: string[] = [];
    const Child = ({ owner }: { owner: Resource }) => {
      useEffect(
        () => () => {
          log.push(`${owner.label}: ${owner.dispose.mock.calls.length}`);
        },
        [owner]
      );
      return null;
    };
    const Owner = ({ dep }: { dep: string }) => (
      <Child owner={useResource(dep)} />
    );
    await render(<Owner dep="A" />);
    await render(<Owner dep="B" />);
    await unmount();
    expect(log).toEqual(['A: 0', 'B: 0']);
    expect(created).toHaveLength(2);
    created.forEach((r) => expect(r.dispose).toHaveBeenCalledTimes(1));
  });

  it('keeps the on-screen value while a transition to new deps suspends', async () => {
    let ready = false;
    let resolve = () => {};
    const pending = new Promise<void>((r) => (resolve = r));
    const Gate = ({ dep }: { dep: string }) => {
      if (dep === 'B' && !ready) throw pending;
      return dep;
    };
    let setDep: (dep: string) => void = () => {};
    const App = () => {
      const [dep, set] = useState('A');
      setDep = set;
      return (
        <Suspense fallback="fallback">
          <Memo dep={dep} />
          <Gate dep={dep} />
        </Suspense>
      );
    };
    await render(<App />);
    await act(async () => startTransition(() => setDep('B')));
    expect(renderer.toJSON()).toBe('A');
    created.forEach((r) => expect(r.dispose).not.toHaveBeenCalled());
    ready = true;
    await act(async () => resolve());
    expect(renderer.toJSON()).toBe('B');
    expect(created[0]!.dispose).toHaveBeenCalledTimes(1);
    expect(created.filter((r) => !r.dispose.mock.calls.length)).toHaveLength(1);
    await unmount();
  });
});

describe('useRiveFile', () => {
  const factory = (global as any).mockRiveFileFactory;
  let latest: ReturnType<typeof useRiveFile>;
  const Loader = () => {
    latest = useRiveFile({ uri: 'https://x/a.riv' });
    return null;
  };

  it('keeps the file, even one loading when hidden, across hide and reveal', async () => {
    const file = nativeLike({});
    let finish: (f: unknown) => void = () => {};
    factory.fromURL.mockImplementation(() => new Promise((r) => (finish = r)));
    await render(activity('visible', <Loader />));
    await render(activity('hidden', <Loader />));
    await act(async () => finish(file));
    await hideAndReveal(<Loader />);
    expect(factory.fromURL).toHaveBeenCalledTimes(1);
    expect(file.dispose).not.toHaveBeenCalled();
    expect(latest.riveFile).toBe(file);
    await unmount();
    expect(file.dispose).toHaveBeenCalledTimes(1);
  });
});

it('async useViewModelInstance shows the kept instance when the source changes and changes back while hidden', async () => {
  const [a, b] = ['a', 'b'].map((label) => {
    const instance = nativeLike({ label });
    const viewModel = nativeLike({
      createDefaultInstanceAsync: jest.fn(async () => instance),
    });
    const file = {
      defaultArtboardViewModelAsync: jest.fn(async () => viewModel),
    } as unknown as RiveFile;
    return { file, viewModel, instance };
  }) as [any, any];
  let latest: ReturnType<typeof useViewModelInstance>;
  const Vmi = ({ file }: { file: RiveFile }) => {
    latest = useViewModelInstance(file, { async: true });
    return null;
  };
  await render(activity('visible', <Vmi file={a.file} />));
  await render(activity('hidden', <Vmi file={a.file} />));
  await render(activity('hidden', <Vmi file={b.file} />));
  await render(activity('hidden', <Vmi file={a.file} />));
  await render(activity('visible', <Vmi file={a.file} />));
  expect(latest!.instance).toBe(a.instance);
  expect(latest!.isLoading).toBe(false);
  expect(a.viewModel.createDefaultInstanceAsync).toHaveBeenCalledTimes(1);
  expect(a.instance.dispose).not.toHaveBeenCalled();
  await unmount();
  expect(a.instance.dispose).toHaveBeenCalledTimes(1);
});

describe('property hooks', () => {
  it.each([
    ['useRiveNumber', 'numberProperty', useRiveNumber],
    ['useRiveTrigger', 'triggerProperty', useRiveTrigger],
    ['useRiveList', 'listProperty', useRiveList],
  ] as const)(
    '%s keeps the property and resubscribes on reveal',
    async (_, accessor, hook) => {
      const property = nativeLike({
        addListener: jest.fn(() => () => {}),
        getValueAsync: jest.fn(async () => 1),
        getLengthAsync: jest.fn(async () => 0),
      });
      const instance = {
        [accessor]: () => property,
      } as unknown as ViewModelInstance;
      const useHook = hook as (path: string, vmi: ViewModelInstance) => unknown;
      const Consumer = () => {
        useHook('p', instance);
        return null;
      };
      await hideAndReveal(<Consumer />);
      expect(property.addListener).toHaveBeenCalledTimes(2);
      expect(property.dispose).not.toHaveBeenCalled();
      await unmount();
      expect(property.dispose).toHaveBeenCalledTimes(1);
    }
  );
});

it('RiveView keeps its view across hide and reveal, and disposes a view that Fabric replaced', async () => {
  const makeView = () =>
    Object.create(
      { play: jest.fn() },
      { dispose: { value: jest.fn(), configurable: true } }
    );
  const view = (
    <RiveView
      file={{} as RiveFile}
      dataBind={{} as ViewModelInstance}
      hybridRef={{ f: () => {} }}
    />
  );
  const setRef = (ref: unknown) =>
    act(async () =>
      renderer.root.findByType('RiveView' as never).props.hybridRef.f(ref)
    );
  const [first, second] = [makeView(), makeView()];
  await render(activity('visible', view));
  await setRef(first);
  await hideAndReveal(view);
  expect(typeof first.play).toBe('function');
  expect(first.dispose).not.toHaveBeenCalled();
  await setRef(second);
  expect(first.dispose).toHaveBeenCalledTimes(1);
  expect(second.dispose).not.toHaveBeenCalled();
  await unmount();
  expect(second.dispose).toHaveBeenCalledTimes(1);
  expect(first.dispose).toHaveBeenCalledTimes(1);
});
