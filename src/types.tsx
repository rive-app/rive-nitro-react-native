/**
 * A value or a function that computes a new value from the previous value.
 * Similar to React's SetStateAction pattern.
 */
export type SetValueAction<T> = T | ((prevValue: T | undefined) => T);

export interface UseRivePropertyResult<T> {
  /**
   * The current value of the property.
   */
  value: T | undefined;
  /**
   * Set the value of the property. Accepts either a direct value or
   * a function that receives the previous value and returns the new value.
   * @example
   * setValue(10) // Set to 10
   * setValue((prev) => (prev ?? 0) + 5) // Increment by 5
   */
  setValue: (value: SetValueAction<T>) => void;
  /**
   * The error if the property is not found.
   */
  error: Error | null;
}

export interface UseRiveTriggerResult {
  /**
   * Fires the property trigger.
   */
  trigger: () => void;
  /**
   * The error if the property is not found.
   */
  error: Error | null;
}

/**
 * Parameters for interacting with trigger properties of a ViewModelInstance
 * @property onTrigger - Callback that runs when the trigger fires
 */
export type UseViewModelInstanceTriggerParameters = {
  onTrigger?: () => void;
};
