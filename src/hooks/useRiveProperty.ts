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
): [T | undefined, (value: T) => void, Error | null, P | undefined] {
  const [value, setValue] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);

  // Clear error when path or instance changes
  useEffect(() => {
    setError(null);
  }, [path, viewModelInstance]);

  // Get the property
  const property = useMemo(() => {
    if (!viewModelInstance) return;
    return options.getProperty(
      viewModelInstance,
      path
    ) as unknown as ObservableViewModelProperty<T>;
  }, [options, viewModelInstance, path]);

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
    if (options.onPropertyEventOverride) {
      property.addListener(options.onPropertyEventOverride);
    } else {
      property.addListener((newValue) => {
        setValue(newValue);
      });
    }

    // Cleanup: Remove listeners and dispose of the property
    // This ensures proper cleanup of event listeners and resources
    return () => {
      property.removeListeners();
      property.dispose();
    };
  }, [options, property]);

  // Set the value of the property
  const setPropertyValue = useCallback(
    (newValue: T) => {
      if (!property) {
        setError(
          new Error(
            `Cannot set value for property "${path}" because it was not found. Your view model instance may be undefined, or the path may be incorrect.`
          )
        );
      } else {
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
  addListener: (onChanged: (value: T) => void) => void;
  value: T;
}
