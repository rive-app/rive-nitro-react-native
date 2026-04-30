import type { HybridObject } from 'react-native-nitro-modules';
import type { RiveImage } from './RiveImage.nitro';
import type { BindableArtboard } from './BindableArtboard.nitro';

/**
 * A Rive View Model as created in the Rive editor.
 * @see {@link https://rive.app/docs/runtimes/data-binding Rive Data Binding Documentation}
 */
export interface ViewModel
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  /** @deprecated Use getPropertyCountAsync instead */
  readonly propertyCount: number;
  /** @deprecated Use getInstanceCountAsync instead */
  readonly instanceCount: number;
  /** The name of the view model */
  readonly modelName: string;
  /** The number of properties in the view model */
  getPropertyCountAsync(): Promise<number>;
  /** The number of view model instances in the view model */
  getInstanceCountAsync(): Promise<number>;
  /** @deprecated Use createInstanceByNameAsync instead */
  createInstanceByIndex(index: number): ViewModelInstance | undefined;
  /** @deprecated Use createInstanceByNameAsync instead */
  createInstanceByName(name: string): ViewModelInstance | undefined;
  /** @deprecated Use createDefaultInstanceAsync instead */
  createDefaultInstance(): ViewModelInstance | undefined;
  /** @deprecated Use createBlankInstanceAsync instead */
  createInstance(): ViewModelInstance | undefined;

  /** Create a view model instance by name */
  createInstanceByNameAsync(
    name: string
  ): Promise<ViewModelInstance | undefined>;
  /** Create the default view model instance */
  createDefaultInstanceAsync(): Promise<ViewModelInstance | undefined>;
  /** Create a blank view model instance with default property values */
  createBlankInstanceAsync(): Promise<ViewModelInstance | undefined>;
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

  /** Get an artboard property from the view model instance at the given path */
  artboardProperty(path: string): ViewModelArtboardProperty | undefined;

  /**
   * Get a nested ViewModel instance at the given path.
   * Supports path notation with "/" for nested access (e.g., "Parent/Child").
   * @deprecated Use viewModelAsync instead
   */
  viewModel(path: string): ViewModelInstance | undefined;

  /** Get a nested ViewModel instance at the given path. Supports "/" for nested access (e.g., "Parent/Child"). */
  viewModelAsync(path: string): Promise<ViewModelInstance | undefined>;

  /**
   * Replace the ViewModel instance at the given path with a new instance.
   * The replacement instance must be compatible with the expected ViewModel type.
   * @throws Error if path not found or types incompatible
   */
  replaceViewModel(path: string, instance: ViewModelInstance): void;
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
  /** @deprecated Use getValueAsync (read) or set(value) (write) instead */
  value: number;
  /** Get the current value of the number property */
  getValueAsync(): Promise<number>;
  set(value: number): void;
  /** Add a listener to the view model number property. Returns a function to remove the listener. */
  addListener(onChanged: (value: number) => void): () => void;
}

export interface ViewModelStringProperty
  extends ViewModelProperty,
    ObservableProperty {
  /** @deprecated Use getValueAsync (read) or set(value) (write) instead */
  value: string;
  /** Get the current value of the string property */
  getValueAsync(): Promise<string>;
  set(value: string): void;
  /** Add a listener to the view model string property. Returns a function to remove the listener. */
  addListener(onChanged: (value: string) => void): () => void;
}

export interface ViewModelBooleanProperty
  extends ViewModelProperty,
    ObservableProperty {
  /** @deprecated Use getValueAsync (read) or set(value) (write) instead */
  value: boolean;
  /** Get the current value of the boolean property */
  getValueAsync(): Promise<boolean>;
  set(value: boolean): void;
  /** Add a listener to the view model boolean property. Returns a function to remove the listener. */
  addListener(onChanged: (value: boolean) => void): () => void;
}

export interface ViewModelColorProperty
  extends ViewModelProperty,
    ObservableProperty {
  /** @deprecated Use getValueAsync (read) or set(value) (write) instead */
  value: number;
  /** Get the current value of the color property */
  getValueAsync(): Promise<number>;
  set(value: number): void;
  /** Add a listener to the view model color property. Returns a function to remove the listener. */
  addListener(onChanged: (value: number) => void): () => void;
}

export interface ViewModelEnumProperty
  extends ViewModelProperty,
    ObservableProperty {
  /** @deprecated Use getValueAsync (read) or set(value) (write) instead */
  value: string;
  /** Get the current value of the enum property */
  getValueAsync(): Promise<string>;
  set(value: string): void;
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
  /** @deprecated Use getLengthAsync instead */
  readonly length: number;
  /** @deprecated Use getInstanceAtAsync instead */
  getInstanceAt(index: number): ViewModelInstance | undefined;
  /** The number of instances in the list */
  getLengthAsync(): Promise<number>;
  /** Get the instance at the given index */
  getInstanceAtAsync(index: number): Promise<ViewModelInstance | undefined>;
  /** @deprecated Use addInstanceAsync instead */
  addInstance(instance: ViewModelInstance): void;
  /** @deprecated Use addInstanceAtAsync instead */
  addInstanceAt(instance: ViewModelInstance, index: number): boolean;
  /** @deprecated Use removeInstanceAsync instead */
  removeInstance(instance: ViewModelInstance): void;
  /** @deprecated Use removeInstanceAtAsync instead */
  removeInstanceAt(index: number): void;
  /** @deprecated Use swapAsync instead */
  swap(index1: number, index2: number): boolean;
  /** Add an instance to the end of the list */
  addInstanceAsync(instance: ViewModelInstance): Promise<void>;
  /** Add an instance at the given index */
  addInstanceAtAsync(instance: ViewModelInstance, index: number): Promise<void>;
  /** Remove an instance from the list */
  removeInstanceAsync(instance: ViewModelInstance): Promise<void>;
  /** Remove the instance at the given index */
  removeInstanceAtAsync(index: number): Promise<void>;
  /** Swap the instances at the given indices */
  swapAsync(index1: number, index2: number): Promise<void>;
  /** Add a listener to be notified when the list changes. Returns a function to remove the listener. */
  addListener(onChanged: () => void): () => void;
}

/**
 * An artboard property that allows swapping artboards at runtime.
 * This is a write-only property - artboards can be set but not read.
 * @see {@link https://rive.app/docs/runtimes/data-binding Rive Data Binding Documentation}
 */
export interface ViewModelArtboardProperty extends ViewModelProperty {
  /**
   * Set the artboard for this property.
   * Pass undefined to clear the currently bound artboard.
   */
  set(artboard: BindableArtboard | undefined): void;
}
