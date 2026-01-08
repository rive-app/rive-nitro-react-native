/**
 * Assertion backend for react-native-harness CI tests.
 * Wraps Jest's expect() to implement AssertionBackend interface.
 */
import { expect } from 'react-native-harness';
import type { AssertionBackend, JSType } from './types';

export const harnessBackend: AssertionBackend = {
  assertEqual<T>(actual: T, expected: T, _message: string): void {
    expect(actual).toEqual(expected);
  },

  assertNotThrow(error: Error | undefined, _message: string): void {
    expect(error).toBeUndefined();
  },

  assertThrow(
    error: Error | undefined,
    expectedMessage: string | undefined,
    _message: string
  ): void {
    expect(error).toBeDefined();
    if (expectedMessage !== undefined) {
      expect(error?.message).toBe(expectedMessage);
    }
  },

  assertType(value: unknown, expectedType: JSType, _message: string): void {
    expect(typeof value).toBe(expectedType);
  },

  assertInstanceOf(
    value: unknown,
    constructor: new (...args: unknown[]) => unknown,
    _message: string
  ): void {
    expect(value).toBeInstanceOf(constructor);
  },

  assertContains(value: object, key: string, _message: string): void {
    expect(value).toHaveProperty(key);
  },

  assertIsArray(value: unknown, _message: string): void {
    expect(Array.isArray(value)).toBe(true);
  },

  assertStringContains(
    value: string,
    substring: string,
    _message: string
  ): void {
    expect(value).toContain(substring);
  },

  assertDefined(value: unknown, _message: string): void {
    expect(value).toBeDefined();
  },

  assertUndefined(value: unknown, _message: string): void {
    expect(value).toBeUndefined();
  },
};
