import type { HybridObject } from 'react-native-nitro-modules';
import type { RiveImage } from './RiveImage.nitro';

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
  readonly modelName: string;
  /** Create a new instance of the view model by index */
  createInstanceByIndex(index: number): ViewModelInstance | undefined;
  /** Create a new instance of the view model by name */
  createInstanceByName(name: string): ViewModelInstance | undefined;
  /** Create the default instance of the view model */
  createDefaultInstance(): ViewModelInstance | undefined;
  /** Create an empty/new view model instance */
  createInstance(): ViewModelInstance | undefined;
}

/**
 * An instance of a Rive {@link ViewModel} that can be used to access and modify properties
 * in the view model.
 * @see {@link https://rive.app/docs/runtimes/data-binding Rive Data Binding Documentation}
 */
export interface ViewModelInstance
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  /** The name of the view model instance */
  readonly instanceName: string;
  /** Get a number property from the view model instance at the given path */
  numberProperty(path: string): ViewModelNumberProperty | undefined;

  /** Get a string property from the view model instance at the given path */
  stringProperty(path: string): ViewModelStringProperty | undefined;

  /** Get a boolean property from the view model instance at the given path */
  booleanProperty(path: string): ViewModelBooleanProperty | undefined;

  /** Get a color property from the view model instance at the given path */
  colorProperty(path: string): ViewModelColorProperty | undefined;

  /** Get an enum property from the view model instance at the given path */
  enumProperty(path: string): ViewModelEnumProperty | undefined;

  /** Get a trigger property from the view model instance at the given path */
  triggerProperty(path: string): ViewModelTriggerProperty | undefined;

  /** Get an image property from the view model instance at the given path */
  imageProperty(path: string): ViewModelImageProperty | undefined;

  /** Get a list property from the view model instance at the given path */
  listProperty(path: string): ViewModelListProperty | undefined;
}

export interface ViewModelProperty
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {}

export interface ObservableProperty {
  /** Remove all listeners from the property */
  removeListeners(): void;
}

export interface ViewModelNumberProperty
  extends ViewModelProperty,
    ObservableProperty {
  /** The value of the view model number property */
  value: number;
  /** Add a listener to the view model number property. Returns a function to remove the listener. */
  addListener(onChanged: (value: number) => void): () => void;
}

export interface ViewModelStringProperty
  extends ViewModelProperty,
    ObservableProperty {
  /** The value of the view model string property */
  value: string;
  /** Add a listener to the view model string property. Returns a function to remove the listener. */
  addListener(onChanged: (value: string) => void): () => void;
}

export interface ViewModelBooleanProperty
  extends ViewModelProperty,
    ObservableProperty {
  /** The value of the view model boolean property */
  value: boolean;
  /** Add a listener to the view model boolean property. Returns a function to remove the listener. */
  addListener(onChanged: (value: boolean) => void): () => void;
}

export interface ViewModelColorProperty
  extends ViewModelProperty,
    ObservableProperty {
  /** The value of the view model color property */
  value: number;
  /** Add a listener to the view model color property. Returns a function to remove the listener. */
  addListener(onChanged: (value: number) => void): () => void;
}

export interface ViewModelEnumProperty
  extends ViewModelProperty,
    ObservableProperty {
  /** The value of the view model enum property */
  value: string;
  /** Add a listener to the view model enum property. Returns a function to remove the listener. */
  addListener(onChanged: (value: string) => void): () => void;
}

export interface ViewModelTriggerProperty
  extends ViewModelProperty,
    ObservableProperty {
  /** Add a listener to the view model trigger property. Returns a function to remove the listener. */
  addListener(onChanged: () => void): () => void;
  /** Trigger the view model trigger property */
  trigger(): void;
}

export interface ViewModelImageProperty
  extends ViewModelProperty,
    ObservableProperty {
  /** Set the image property value */
  set(image: RiveImage | undefined): void;
  /** Add a listener to the view model image property. Returns a function to remove the listener. */
  addListener(onChanged: () => void): () => void;
}

/**
 * A list property that contains a dynamic collection of {@link ViewModelInstance} objects.
 * @see {@link https://rive.app/docs/runtimes/data-binding#lists Rive Data Binding Lists}
 */
export interface ViewModelListProperty
  extends ViewModelProperty,
    ObservableProperty {
  /** The number of instances in the list */
  readonly length: number;
  /** Get the instance at the given index */
  instanceAt(index: number): ViewModelInstance | undefined;
  /** Add an instance to the end of the list */
  addInstance(instance: ViewModelInstance): void;
  /** Insert an instance at the given index */
  insertInstance(instance: ViewModelInstance, index: number): void;
  /** Remove an instance from the list */
  removeInstance(instance: ViewModelInstance): void;
  /** Remove the instance at the given index */
  removeInstanceAt(index: number): void;
  /** Swap the instances at the given indices */
  swap(index1: number, index2: number): void;
  /** Add a listener to be notified when the list changes */
  addListener(onChanged: () => void): void;
}
