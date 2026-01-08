/**
 * Assertion backend that throws on failure, for in-app test UI.
 * @see https://github.com/mrousavy/nitro/blob/main/example/src/testing/backends/throwing.ts
 */
import deepEqual from 'deep-equal';
import type { AssertionBackend, JSType } from './types';

export const throwingBackend: AssertionBackend = {
  assertEqual<T>(actual: T, expected: T, message: string): void {
    if (!deepEqual(actual, expected, { strict: true })) {
      throw new Error(message);
    }
  },

  assertNotThrow(error: Error | undefined, message: string): void {
    if (error !== undefined) {
      throw new Error(message);
    }
  },

  assertThrow(
    error: Error | undefined,
    expectedMessage: string | undefined,
    message: string
  ): void {
    if (error === undefined) {
      throw new Error(message);
    }
    if (expectedMessage !== undefined && error.message !== expectedMessage) {
      throw new Error(message);
    }
  },

  assertType(value: unknown, expectedType: JSType, message: string): void {
    if (typeof value !== expectedType) {
      throw new Error(message);
    }
  },

  assertInstanceOf(
    value: unknown,
    constructor: new (...args: unknown[]) => unknown,
    message: string
  ): void {
    if (!(value instanceof constructor)) {
      throw new Error(message);
    }
  },

  assertContains(value: object, key: string, message: string): void {
    if (value === null || value === undefined) {
      throw new Error(message);
    }
    if (
      !(key in value) &&
      !Object.prototype.hasOwnProperty.call(value, key) &&
      !(value as Record<string, unknown>)[key]
    ) {
      throw new Error(message);
    }
  },

  assertIsArray(value: unknown, message: string): void {
    if (!Array.isArray(value)) {
      throw new Error(message);
    }
  },

  assertStringContains(
    value: string,
    substring: string,
    message: string
  ): void {
    if (!value.includes(substring)) {
      throw new Error(message);
    }
  },

  assertDefined(value: unknown, message: string): void {
    if (value === undefined) {
      throw new Error(message);
    }
  },

  assertUndefined(value: unknown, message: string): void {
    if (value !== undefined) {
      throw new Error(message);
    }
  },
};
