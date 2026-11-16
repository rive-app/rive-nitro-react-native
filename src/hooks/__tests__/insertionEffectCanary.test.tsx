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
import { Retainer } from '../useUnmountEffect';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// useUnmountEffect treats an insertion cleanup as a real unmount (#448). React
// tests this in Activity-test.js (facebook/react#30954) but doesn't document it.
const cleanups: string[] = [];
function expectNoInsertionCleanup() {
  if (cleanups.length > 0) {
    throw new Error(
      `React changed insertion-effect semantics, which disposal under Activity (#448) relies on. Cleanups: ${cleanups.join(', ')}`
    );
  }
}

function Probe({ name }: { name: string }) {
  useInsertionEffect(() => () => void cleanups.push(name), [name]);
  return null;
}

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

describe('plain useInsertionEffect', () => {
  beforeEach(() => {
    cleanups.length = 0;
    renderer = undefined as never;
  });
  afterEach(async () => {
    await act(async () => renderer.unmount());
    expect(cleanups).toHaveLength(1);
  });

  it('runs no insertion cleanup when <Activity> hides and reveals', async () => {
    for (const mode of ['visible', 'hidden', 'visible'] as const) {
      await render(
        <Activity mode={mode}>
          <Probe name="activity" />
        </Activity>
      );
    }
    expectNoInsertionCleanup();
  });

  it('runs no insertion cleanup when Suspense hides and reveals', async () => {
    let suspended = false;
    let resolve = () => {};
    const pending = new Promise<void>((r) => (resolve = r));
    const Gate = () => {
      if (suspended) throw pending;
      return null;
    };
    const tree = (
      <Suspense fallback={null}>
        <Probe name="suspense" />
        <Gate />
      </Suspense>
    );
    await render(tree);
    suspended = true;
    await render(tree);
    suspended = false;
    await act(async () => resolve());
    expectNoInsertionCleanup();
  });

  it('runs no insertion cleanup when Strict Mode replays effects', async () => {
    await render(
      <StrictMode>
        <Probe name="strict" />
      </StrictMode>
    );
    expectNoInsertionCleanup();
  });
});

it('logs the dev canary when a released Retainer is retained again', async () => {
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  const retainer = new Retainer(() => {});
  retainer.retain()();
  await Promise.resolve();
  retainer.retain();
  // jest-setup.js matches this text to fail tests that hit the canary.
  expect(error).toHaveBeenCalledWith(
    expect.stringContaining(
      'shown again after its native objects were released'
    )
  );
  error.mockRestore();
});
