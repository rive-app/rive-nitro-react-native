/**
 * Chainable assertion API adapted from Nitro.
 * @see https://github.com/mrousavy/nitro/blob/main/example/src/testing/State.ts
 */
import type { AssertionBackend, JSType } from './types';

function stringify(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'function')
    return `[Function: ${value.name || 'anonymous'}]`;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export class State<T> {
  public readonly result: T | undefined;
  public readonly errorThrown: Error | undefined;
  private readonly backend: AssertionBackend;

  constructor(
    result: T | undefined,
    errorThrown: Error | undefined,
    backend: AssertionBackend
  ) {
    this.result = result;
    this.errorThrown = errorThrown;
    this.backend = backend;
  }

  didThrow(expectedMessage?: string): State<T> {
    this.backend.assertThrow(
      this.errorThrown,
      expectedMessage,
      expectedMessage
        ? `Expected to throw error with message "${expectedMessage}", but ${
            this.errorThrown
              ? `got "${this.errorThrown.message}"`
              : 'no error was thrown'
          }`
        : `Expected to throw an error, but got result: ${stringify(this.result)}`
    );
    return this;
  }

  didNotThrow(): State<T> {
    this.backend.assertNotThrow(
      this.errorThrown,
      `Expected not to throw, but threw: ${this.errorThrown?.message}`
    );
    return this;
  }

  equals(expected: T): State<T> {
    this.didNotThrow();
    this.backend.assertEqual(
      this.result,
      expected,
      `Expected ${stringify(expected)}, but got ${stringify(this.result)}`
    );
    return this;
  }

  didReturn(expectedType: JSType): State<T> {
    this.didNotThrow();
    this.backend.assertType(
      this.result,
      expectedType,
      `Expected type "${expectedType}", but got "${typeof this.result}"`
    );
    return this;
  }

  isInstanceOf(constructor: new (...args: unknown[]) => unknown): State<T> {
    this.didNotThrow();
    this.backend.assertInstanceOf(
      this.result,
      constructor,
      `Expected instance of ${constructor.name}, but got ${stringify(this.result)}`
    );
    return this;
  }

  toContain(key: string): State<T> {
    this.didNotThrow();
    this.backend.assertContains(
      this.result as object,
      key,
      `Expected object to contain key "${key}", but it doesn't`
    );
    return this;
  }

  toBeArray(): State<T> {
    this.didNotThrow();
    this.backend.assertIsArray(
      this.result,
      `Expected array, but got ${stringify(this.result)}`
    );
    return this;
  }

  toStringContain(substring: string): State<T> {
    this.didNotThrow();
    this.backend.assertType(
      this.result,
      'string',
      `Expected string, but got ${typeof this.result}`
    );
    this.backend.assertStringContains(
      this.result as string,
      substring,
      `Expected string to contain "${substring}", but got "${this.result}"`
    );
    return this;
  }

  toBeDefined(): State<T> {
    this.didNotThrow();
    this.backend.assertDefined(
      this.result,
      `Expected value to be defined, but got undefined`
    );
    return this;
  }

  toBeUndefined(): State<T> {
    this.didNotThrow();
    this.backend.assertUndefined(
      this.result,
      `Expected value to be undefined, but got ${stringify(this.result)}`
    );
    return this;
  }
}
