/* eslint-disable @typescript-eslint/no-deprecated -- real <Activity> needs a concurrent root, which only react-test-renderer offers here */
import {
  Activity,
  act,
  StrictMode,
  Suspense,
  useInsertionEffect,
  type ReactElement,
} from 'react';
import TestRenderer, { type ReactTestRenderer } from 'react-test-renderer';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Disposal under <Activity> (#448) treats an insertion cleanup as a real
// unmount; React tests this in Activity-test.js (facebook/react#30954) but
// does not document it.
const SEMANTICS_CHANGED =
  'React changed insertion-effect semantics; disposal under Activity (#448) relies on this';

function expectNoInsertionCleanup(cleanups: string[]) {
  if (cleanups.length > 0) {
    throw new Error(`${SEMANTICS_CHANGED}. Cleanups: ${cleanups.join(', ')}`);
  }
}

const cleanups: string[] = [];

function Probe({ name }: { name: string }) {
  useInsertionEffect(
    () => () => {
      cleanups.push(name);
    },
    [name]
  );
  return null;
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

beforeEach(() => {
  cleanups.length = 0;
});

describe('plain useInsertionEffect', () => {
  it('runs no cleanup when <Activity> hides and reveals', async () => {
    const tree = (mode: 'visible' | 'hidden') => (
      <Activity mode={mode}>
        <Probe name="activity" />
      </Activity>
    );
    const renderer = await mount(tree('visible'));
    await act(async () => renderer.update(tree('hidden')));
    await act(async () => renderer.update(tree('visible')));
    expectNoInsertionCleanup(cleanups);
    await act(async () => renderer.unmount());
    expect(cleanups).toEqual(['activity']);
  });

  it('runs no cleanup when Suspense hides and reveals', async () => {
    let suspended = false;
    let resolve = () => {};
    const pending = new Promise<void>((r) => (resolve = r));
    const Gate = () => {
      if (suspended) throw pending;
      return null;
    };
    const tree = () => (
      <Suspense fallback={null}>
        <Probe name="suspense" />
        <Gate />
      </Suspense>
    );
    const renderer = await mount(tree());
    suspended = true;
    await act(async () => renderer.update(tree()));
    suspended = false;
    resolve();
    await act(async () => renderer.update(tree()));
    expectNoInsertionCleanup(cleanups);
    await act(async () => renderer.unmount());
    expect(cleanups).toEqual(['suspense']);
  });

  it('runs no cleanup when Strict Mode replays effects', async () => {
    const renderer = await mount(
      <StrictMode>
        <Probe name="strict" />
      </StrictMode>
    );
    expectNoInsertionCleanup(cleanups);
    await act(async () => renderer.unmount());
    expect(cleanups).toEqual(['strict']);
  });
});
