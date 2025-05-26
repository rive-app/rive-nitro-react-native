export interface UseRivePropertyResult<T> {
  /**
   * The current value of the property.
   */
  value: T | undefined;
  /**
   * Set the value of the property.
   * @param value - The value to set the property to.
   */
  setValue: (value: T) => void;
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
