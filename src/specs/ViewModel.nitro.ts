import type { HybridObject } from 'react-native-nitro-modules';

/**
 * A Rive View Model as created in the Rive editor.
 * @see {@link https://rive.app/docs/runtimes/data-binding Rive Data Binding Documentation}
 */
export interface ViewModel
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  /** The number of properties in the view model */
  readonly propertyCount: number;
  /** The number of view model instances in the view model */
  readonly instanceCount: number;
  /** The name of the view model */
  readonly name: string;
  /** Create a new instance of the view model by index */
  createInstanceByIndex(index: number): ViewModelInstance | null;
  /** Create a new instance of the view model by name */
  createInstanceByName(name: string): ViewModelInstance | null;
  /** Create the default instance of the view model */
  createDefaultInstance(): ViewModelInstance | null;
  /** Create an empty/new view model instance */
  createInstance(): ViewModelInstance | null;
}

/**
 * An instance of a Rive {@link ViewModel} that can be used to access and modify properties
 * in the view model.
 * @see {@link https://rive.app/docs/runtimes/data-binding Rive Data Binding Documentation}
 */
export interface ViewModelInstance
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  /** The name of the view model instance */
  readonly name: string;
}
