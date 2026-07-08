import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type ObservableProperty,
  type ViewModelInstance,
  type ViewModelProperty,
} from '../specs/ViewModel.nitro';
import { useDisposableMemo } from './useDisposableMemo';

/**
 * Base hook for all ViewModelInstance value-property interactions
 * (number, string, boolean, color, enum).
 *
 * Not used for triggers — see {@link useRiveTrigger} which manages its own
 * property lifecycle to avoid coupling callback identity to native disposal.
 *
 * @template P - The type of the property (e.g., ViewModelBooleanProperty)
 * @template T - The primitive type of the property value (number, boolean, string)
 *
 * @param viewModelInstance - The source ViewModelInstance
 * @param path - Property path in the ViewModelInstance
 * @param getProperty - Function to get the property from a ViewModelInstance
 * @returns A tuple containing [value, setter, error, property]
 */
export function useRiveProperty<P extends ViewModelProperty, T>(
  viewModelInstance: ViewModelInstance | null | undefined,
  path: string,
  getProperty: (vm: ViewModelInstance, path: string) => P | undefined
): [
  T | undefined,
  (value: T | ((prevValue: T | undefined) => T)) => void,
  Error | null,
  P | undefined,
] {
  // Nulled by useDisposableMemo the moment the property is disposed, so the
  // setter can tell a live property from a disposed one (see setPropertyValue).
  const liveRef = useRef<ObservableViewModelProperty<T> | undefined>(undefined);
  const wasEverLive = useRef(false);
  const property = useDisposableMemo(
    () => {
      if (!viewModelInstance) return undefined;
      return getProperty(
        viewModelInstance,
        path
      ) as unknown as ObservableViewModelProperty<T>;
    },
    (p) => p?.dispose(),
    [viewModelInstance, path],
    liveRef
  );

  if (liveRef.current) {
    wasEverLive.current = true;
  }

  // Always start undefined — the listener delivers the current value as its first emission.
  // (iOS experimental: via valueStream; iOS/Android legacy: emitted synchronously on subscribe)
  // This ensures consumers handle the loading state correctly on all backends.
  const [value, setValue] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);

  // Clear error when path or instance changes
  useEffect(() => {
    setError(null);
  }, [path, viewModelInstance]);

  // Set error if property is not found
  useEffect(() => {
    if (viewModelInstance && !property) {
      setError(
        new Error(`Property "${path}" not found in the ViewModel instance`)
      );
    }
  }, [viewModelInstance, property, path]);

  // Add listener for changes to the property
  useEffect(() => {
    if (!property) return;
    let cancelled = false;
    let listenerDelivered = false;

    // Deliver the current value so the hook transitions from undefined → value
    // without waiting for a property change (legacy addListener does NOT emit
    // on subscribe — only on changes). On the experimental backend the
    // accessor returns an unvalidated handle — the command server can only
    // report a bad path asynchronously — so a rejection here is also how
    // "property not found" surfaces as the hook's error.
    property.getValueAsync().then(
      (initialValue) => {
        // A listener emission is always newer than this read — never
        // overwrite it with the stale initial value.
        if (!cancelled && !listenerDelivered) {
          setValue(initialValue);
        }
      },
      (e: unknown) => {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : String(e);
        setError(new Error(`Property "${path}" is not available: ${message}`));
      }
    );

    const removeListener = property.addListener((newValue) => {
      listenerDelivered = true;
      setValue(newValue);
    });

    return () => {
      cancelled = true;
      try {
        removeListener();
      } catch {
        // Property may already be disposed by useDisposableMemo (deps change).
        // Native dispose() handles listener cleanup, so this is safe to ignore.
      }
    };
  }, [property, path]);

  // Set the value of the property (warn + no-op if the property isn't
  // available). Uses tracked `value` from state for updater functions —
  // avoids a synchronous property.value read and is consistent with how
  // React state works.
  const setPropertyValue = useCallback(
    (valueOrUpdater: T | ((prevValue: T | undefined) => T)) => {
      // Read through liveRef instead of the captured `property`: a stale
      // closure (e.g. an async callback) can fire after the property was
      // disposed by a deps change or unmount, and writing to the disposed
      // hybrid throws ("NativeState is null" — fatal when uncaught in
      // release). Same guard as useRiveTrigger.
      const liveProperty = liveRef.current;
      if (!liveProperty) {
        if (wasEverLive.current) {
          console.warn(
            `useRiveProperty: setValue('${path}') called after dispose. ` +
              'The property has been cleaned up — this is likely a stale closure ' +
              'from an async callback that fired after unmount.'
          );
        } else {
          console.warn(
            `useRiveProperty: setValue('${path}') called but the property is not available yet. ` +
              'The viewModelInstance may still be loading.'
          );
        }
        return;
      } else {
        const newValue =
          typeof valueOrUpdater === 'function'
            ? (valueOrUpdater as (prevValue: T | undefined) => T)(value)
            : valueOrUpdater;
        liveProperty.set(newValue);
      }
    },
    // `property` kept in deps so the setter identity changes with the
    // property — consumers' effects keyed on the setter re-fire (see
    // "should apply value after instance becomes available" test).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [property, path, value]
  );

  return [value, setPropertyValue, error, property as unknown as P];
}

/**
 * This interface extends the ViewModelProperty and ObservableProperty interfaces
 * with the typed async/observable surface the hook drives (the deprecated
 * sync `value` accessor is deliberately not part of it).
 *
 * @template T - The primitive type of the property value (number, boolean, string)
 */
interface ObservableViewModelProperty<T>
  extends ViewModelProperty,
    ObservableProperty {
  addListener: (onChanged: (value: T) => void) => () => void;
  getValueAsync(): Promise<T>;
  set(value: T): void;
}
