import { useCallback, useEffect, useState } from 'react';
import {
  type ObservableProperty,
  type ViewModelInstance,
  type ViewModelProperty,
} from '../specs/ViewModel.nitro';
import { useDisposableMemo } from './useDisposableMemo';

/**
 * Base hook for all ViewModelInstance property interactions.
 * This hook provides a unified interface for working with different types of
 * Rive properties (boolean, number, string, enum, trigger) while maintaining
 * type safety and proper cleanup.
 *
 * @template P - The type of the property (e.g., ViewModelBooleanProperty, ViewModelNumberProperty)
 * @template T - The primitive type of the property value (number, boolean, string)
 *
 * @param viewModelInstance - The source ViewModelInstance
 * @param path - Property path in the ViewModelInstance
 * @param options - Configuration for working with the property
 * @returns A tuple containing [value, setter, error, property]
 */
export function useRiveProperty<P extends ViewModelProperty, T>(
  viewModelInstance: ViewModelInstance | null | undefined,
  path: string,
  options: {
    /** Function to get the property from a ViewModelInstance */
    getProperty: (vm: ViewModelInstance, path: string) => P | undefined;
    /** Optional override callback for property events (mainly used by triggers) */
    onPropertyEventOverride?: (...args: any[]) => void;
  }
): [
  T | undefined,
  (value: T | ((prevValue: T | undefined) => T)) => void,
  Error | null,
  P | undefined,
] {
  const property = useDisposableMemo(
    () => {
      if (!viewModelInstance) return undefined;
      return options.getProperty(
        viewModelInstance,
        path
      ) as unknown as ObservableViewModelProperty<T>;
    },
    (p) => p?.dispose(),
    [options, viewModelInstance, path]
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
    if (!options.onPropertyEventOverride) {
      setValue(property.value);
    }

    const removeListener = options.onPropertyEventOverride
      ? property.addListener(options.onPropertyEventOverride)
      : property.addListener((newValue) => {
          setValue(newValue);
        });

    return () => {
      removeListener();
    };
  }, [options, property]);

  // Set the value of the property (no-op if property isn't available yet).
  // Uses tracked `value` from state for updater functions — avoids a synchronous
  // property.value read and is consistent with how React state works.
  const setPropertyValue = useCallback(
    (valueOrUpdater: T | ((prevValue: T | undefined) => T)) => {
      if (!property) {
        return;
      } else {
        const newValue =
          typeof valueOrUpdater === 'function'
            ? (valueOrUpdater as (prevValue: T | undefined) => T)(value)
            : valueOrUpdater;
        property.value = newValue;
      }
    },
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
