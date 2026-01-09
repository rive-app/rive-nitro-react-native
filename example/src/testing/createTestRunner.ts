/**
 * Test runner factory with timeout handling, adapted from Nitro.
 * @see https://github.com/mrousavy/nitro/blob/main/example/src/testing/createTestRunner.ts
 */
import { State } from './State';
import type { AssertionBackend } from './types';

const DEFAULT_TIMEOUT_MS = 1500;

function timeoutedPromise<T>(
  promise: Promise<T>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  return new Promise((resolve, reject) => {
    let didResolve = false;

    const timeout = setTimeout(() => {
      if (!didResolve) {
        didResolve = true;
        reject(new Error(`Test timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    promise
      .then((result) => {
        if (!didResolve) {
          didResolve = true;
          clearTimeout(timeout);
          resolve(result);
        }
      })
      .catch((error) => {
        if (!didResolve) {
          didResolve = true;
          clearTimeout(timeout);
          reject(error);
        }
      });
  });
}

export interface TestRunner {
  it<T>(action: () => T): State<T>;
  it<T>(action: () => Promise<T>): Promise<State<T>>;
}

export function createTestRunner(backend: AssertionBackend): TestRunner {
  function it<T>(action: () => T): State<T>;
  function it<T>(action: () => Promise<T>): Promise<State<T>>;
  function it<T>(action: () => T | Promise<T>): State<T> | Promise<State<T>> {
    let result: T | undefined;
    let error: Error | undefined;

    try {
      const maybePromise = action();

      if (maybePromise instanceof Promise) {
        return timeoutedPromise(
          maybePromise
            .then((r) => new State<T>(r, undefined, backend))
            .catch((e) => new State<T>(undefined, e as Error, backend))
        );
      }

      result = maybePromise;
    } catch (e) {
      error = e as Error;
    }

    return new State<T>(result, error, backend);
  }

  return { it };
}
