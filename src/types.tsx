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

export interface UseRiveListResult {
  /**
   * The number of instances in the list.
   */
  length: number;
  /**
   * Get the instance at the given index.
   */
  getInstanceAt: (
    index: number
  ) => import('./specs/ViewModel.nitro').ViewModelInstance | undefined;
  /**
   * Add an instance to the end of the list.
   */
  addInstance: (
    instance: import('./specs/ViewModel.nitro').ViewModelInstance
  ) => void;
  /**
   * Add an instance at the given index.
   * @returns true if successful
   */
  addInstanceAt: (
    instance: import('./specs/ViewModel.nitro').ViewModelInstance,
    index: number
  ) => boolean;
  /**
   * Remove an instance from the list.
   */
  removeInstance: (
    instance: import('./specs/ViewModel.nitro').ViewModelInstance
  ) => void;
  /**
   * Remove the instance at the given index.
   */
  removeInstanceAt: (index: number) => void;
  /**
   * Swap the instances at the given indices.
   * @returns true if successful
   */
  swap: (index1: number, index2: number) => boolean;
  /**
   * The error if the property is not found.
   */
  error: Error | null;
}
