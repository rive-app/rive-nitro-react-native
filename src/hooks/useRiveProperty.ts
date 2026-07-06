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

    // Deliver the current value immediately so the hook transitions from
    // undefined → value without waiting for a property change.
    // (Legacy addListener does NOT emit on subscribe — only on changes.
    //  Experimental valueStream emits the current value as its first element.)
    setValue(property.value);

    const removeListener = property.addListener((newValue) => {
      setValue(newValue);
    });

    return () => {
      try {
        removeListener();
      } catch {
        // Property may already be disposed by useDisposableMemo (deps change).
        // Native dispose() handles listener cleanup, so this is safe to ignore.
      }
    };
  }, [property]);

  // Set the value of the property (no-op if property isn't available yet).
  // Uses tracked `value` from state for updater functions — avoids a synchronous
  // property.value read and is consistent with how React state works.
  const setPropertyValue = useCallback(
    (valueOrUpdater: T | ((prevValue: T | undefined) => T)) => {
      // Read through liveRef instead of the captured `property`: a stale
      // closure (e.g. an async callback) can fire after the property was
      // disposed by a deps change or unmount, and writing to the disposed
      // hybrid throws ("NativeState is null" — fatal when uncaught in
      // release). Same guard as useRiveTrigger.
      const liveProperty = liveRef.current;
      if (!liveProperty) {
        return;
      } else {
        const newValue =
          typeof valueOrUpdater === 'function'
            ? (valueOrUpdater as (prevValue: T | undefined) => T)(value)
            : valueOrUpdater;
        liveProperty.value = newValue;
      }
    },
    // `property` kept in deps so the setter identity changes with the
    // property — consumers' effects keyed on the setter re-fire (see
    // "should apply value after instance becomes available" test).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [property, value]
  );

  return [value, setPropertyValue, error, property as unknown as P];
}

/**
 * This interface extends the ViewModelProperty and ObservableProperty interfaces.
 * It adds the addListener and value as known properties.
 *
 * @template T - The primitive type of the property value (number, boolean, string)
 */
interface ObservableViewModelProperty<T>
  extends ViewModelProperty,
    ObservableProperty {
  addListener: (onChanged: (value: T) => void) => () => void;
  value: T;
}
