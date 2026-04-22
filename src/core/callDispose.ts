const NITRO_DISPOSE_ERROR = 'failed to define internal native state property';

interface Disposable {
  dispose(): void;
}

/**
 * Safely disposes a Nitro HybridObject.
 *
 * Before calling dispose(), overrides all JS-visible properties with undefined
 * so that React Fabric can safely diff old props without crashing. Without this,
 * Fabric's cloneNodeWithNewProps reads properties (e.g. toString, artboardNames)
 * from the disposed object whose NativeState is already null, causing:
 *   "Cannot get hybrid property ... - `this`'s `NativeState` is `null`"
 *
 * Also handles https://github.com/mrousavy/nitro/issues/1083
 */
export function callDispose(obj: Disposable): void {
  // Override inherited (prototype) properties — these are the Nitro HybridObject
  // getters that would throw after dispose. Own properties are left alone since
  // they are plain JS values, not native getters.
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) continue;
    if (key === '__type' || key === 'dispose') continue;
    try {
      Object.defineProperty(obj, key, {
        value: undefined,
        enumerable: false,
        configurable: true,
      });
    } catch (_) {
      // non-configurable — skip
    }
  }

  try {
    Object.defineProperty(obj, 'toString', {
      value: () => '[disposed HybridObject]',
      enumerable: false,
      configurable: true,
    });
  } catch (_) {
    // skip
  }

  try {
    obj.dispose();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error ?? '');
    if (!message.includes(NITRO_DISPOSE_ERROR)) {
      throw error;
    }
  }
}
