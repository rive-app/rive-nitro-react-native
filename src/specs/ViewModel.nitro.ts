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

  /** Get a number property from the view model instance at the given path */
  numberProperty(path: string): ViewModelNumberProperty | null;

  /** Get a string property from the view model instance at the given path */
  stringProperty(path: string): ViewModelStringProperty | null;

  /** Get a boolean property from the view model instance at the given path */
  booleanProperty(path: string): ViewModelBooleanProperty | null;

  /** Get a color property from the view model instance at the given path */
  colorProperty(path: string): ViewModelColorProperty | null;

  /** Get an enum property from the view model instance at the given path */
  enumProperty(path: string): ViewModelEnumProperty | null;

  /** Get a trigger property from the view model instance at the given path */
  triggerProperty(path: string): ViewModelTriggerProperty | null;
}

export interface ViewModelProperty
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  dispose(): void;
}

export interface ObservableProperty {
  /** Remove all listeners from the view model number property */
  removeListeners(): void;
}

export interface ViewModelNumberProperty
  extends ViewModelProperty,
    ObservableProperty {
  /** The value of the view model number property */
  value: number;
  /** Add a listener to the view model number property */
  addListener(onChanged: (value: number) => void): void;
}

export interface ViewModelStringProperty
  extends ViewModelProperty,
    ObservableProperty {
  /** The value of the view model string property */
  value: string;
  /** Add a listener to the view model string property */
  addListener(onChanged: (value: string) => void): void;
}

export interface ViewModelBooleanProperty
  extends ViewModelProperty,
    ObservableProperty {
  /** The value of the view model boolean property */
  value: boolean;
  /** Add a listener to the view model boolean property */
  addListener(onChanged: (value: boolean) => void): void;
}

export interface ViewModelColorProperty
  extends ViewModelProperty,
    ObservableProperty {
  /** The value of the view model color property */
  value: number;
  /** Add a listener to the view model color property */
  addListener(onChanged: (value: number) => void): void;
}

export interface ViewModelEnumProperty
  extends ViewModelProperty,
    ObservableProperty {
  /** The value of the view model enum property */
  value: string;
  /** Add a listener to the view model enum property */
  addListener(onChanged: (value: string) => void): void;
}

export interface ViewModelTriggerProperty
  extends ViewModelProperty,
    ObservableProperty {
  /** Add a listener to the view model trigger property */
  addListener(onChanged: () => void): void;
  /** Trigger the view model trigger property */
  trigger(): void;
}
