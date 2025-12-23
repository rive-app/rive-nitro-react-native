import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  type ObservableProperty,
  type ViewModelInstance,
  type ViewModelProperty,
} from '../specs/ViewModel.nitro';

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
  // Get the property first so we can read its initial value
  const property = useMemo(() => {
    if (!viewModelInstance) return;
    return options.getProperty(
      viewModelInstance,
      path
    ) as unknown as ObservableViewModelProperty<T>;
  }, [options, viewModelInstance, path]);

  // Initialize state with property's current value (if available)
  const [value, setValue] = useState<T | undefined>(() => property?.value);
  const [error, setError] = useState<Error | null>(null);

  // Sync value when property reference changes (path or instance changed)
  useEffect(() => {
    if (property) {
      setValue(property.value);
    }
  }, [property]);

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

    // If an override callback is provided, use it.
    // Otherwise, use the default callback.
    const removeListener = options.onPropertyEventOverride
      ? property.addListener(options.onPropertyEventOverride)
      : property.addListener((newValue) => {
          setValue(newValue);
        });

    return () => {
      removeListener();
      property.dispose();
    };
  }, [options, property]);

  // Set the value of the property
  const setPropertyValue = useCallback(
    (valueOrUpdater: T | ((prevValue: T | undefined) => T)) => {
      if (!property) {
        setError(
          new Error(
            `Cannot set value for property "${path}" because it was not found. Your view model instance may be undefined, or the path may be incorrect.`
          )
        );
      } else {
        const newValue =
          typeof valueOrUpdater === 'function'
            ? (valueOrUpdater as (prevValue: T | undefined) => T)(
                property.value
              )
            : valueOrUpdater;
        property.value = newValue;
      }
    },
    [property, path]
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
