import { renderHook } from '@testing-library/react-native';
import { useViewModelInstance } from '../useViewModelInstance';
import type { RiveFile } from '../../specs/RiveFile.nitro';
import type { ViewModel, ViewModelInstance } from '../../specs/ViewModel.nitro';
import type { ArtboardBy } from '../../specs/ArtboardBy';

function createMockViewModelInstance(): ViewModelInstance {
  return {
    instanceName: 'TestInstance',
    dispose: jest.fn(),
    numberProperty: jest.fn(),
    stringProperty: jest.fn(),
    booleanProperty: jest.fn(),
    colorProperty: jest.fn(),
    enumProperty: jest.fn(),
    triggerProperty: jest.fn(),
    imageProperty: jest.fn(),
    listProperty: jest.fn(),
    artboardProperty: jest.fn(),
    viewModel: jest.fn(),
    replaceViewModel: jest.fn(),
  } as any;
}

function createMockViewModel(options?: {
  defaultInstance?: ViewModelInstance;
  namedInstances?: Record<string, ViewModelInstance>;
}): ViewModel {
  return {
    propertyCount: 0,
    instanceCount: 1,
    modelName: 'TestViewModel',
    dispose: jest.fn(),
    createInstanceByIndex: jest.fn(),
    createInstanceByName: jest.fn(
      (name: string) => options?.namedInstances?.[name]
    ),
    createDefaultInstance: jest.fn(() => options?.defaultInstance),
    createInstance: jest.fn(),
  } as any;
}

function createMockRiveFile(options?: {
  defaultViewModel?: ViewModel;
  artboardViewModels?: Record<string, ViewModel>;
  namedViewModels?: Record<string, ViewModel>;
}): RiveFile {
  return {
    dispose: jest.fn(),
    updateReferencedAssets: jest.fn(),
    viewModelCount: 0,
    artboardCount: 0,
    artboardNames: [],
    viewModelByIndex: jest.fn(),
    viewModelByName: jest.fn(
      (name: string) => options?.namedViewModels?.[name]
    ),
    defaultArtboardViewModel: jest.fn((artboardBy?: ArtboardBy) => {
      if (artboardBy?.name && options?.artboardViewModels) {
        return options.artboardViewModels[artboardBy.name];
      }
      return options?.defaultViewModel;
    }),
    getBindableArtboard: jest.fn(),
  } as any;
}

describe('useViewModelInstance - RiveFile with instanceName parameter', () => {
  it('should use createInstanceByName when instanceName is provided with RiveFile', () => {
    const personInstance = createMockViewModelInstance();
    const defaultViewModel = createMockViewModel({
      namedInstances: { PersonInstance: personInstance },
    });

    const mockRiveFile = createMockRiveFile({ defaultViewModel });

    const { result } = renderHook(() =>
      useViewModelInstance(mockRiveFile, { instanceName: 'PersonInstance' })
    );

    expect(mockRiveFile.defaultArtboardViewModel).toHaveBeenCalledWith(
      undefined
    );
    expect(defaultViewModel.createInstanceByName).toHaveBeenCalledWith(
      'PersonInstance'
    );
    expect(defaultViewModel.createDefaultInstance).not.toHaveBeenCalled();
    expect(result.current).toBe(personInstance);
  });

  it('should use defaultArtboardViewModel and createDefaultInstance when no instanceName provided', () => {
    const defaultInstance = createMockViewModelInstance();
    const defaultViewModel = createMockViewModel({ defaultInstance });

    const mockRiveFile = createMockRiveFile({ defaultViewModel });

    const { result } = renderHook(() => useViewModelInstance(mockRiveFile));

    expect(mockRiveFile.defaultArtboardViewModel).toHaveBeenCalledWith(
      undefined
    );
    expect(defaultViewModel.createDefaultInstance).toHaveBeenCalled();
    expect(defaultViewModel.createInstanceByName).not.toHaveBeenCalled();
    expect(result.current).toBe(defaultInstance);
  });

  it('should return null when instance name not found and required is false', () => {
    const defaultViewModel = createMockViewModel({
      namedInstances: {},
    });

    const mockRiveFile = createMockRiveFile({ defaultViewModel });

    const { result } = renderHook(() =>
      useViewModelInstance(mockRiveFile, { instanceName: 'NonExistent' })
    );

    expect(result.current).toBeNull();
  });

  it('should throw when instance name not found and required is true', () => {
    const defaultViewModel = createMockViewModel({
      namedInstances: {},
    });

    const mockRiveFile = createMockRiveFile({ defaultViewModel });

    expect(() =>
      renderHook(() =>
        useViewModelInstance(mockRiveFile, {
          instanceName: 'NonExistent',
          required: true,
        })
      )
    ).toThrow("ViewModel instance 'NonExistent' not found");
  });

  it('should return null when artboardName not found and required is false', () => {
    const mockRiveFile = createMockRiveFile({
      artboardViewModels: {},
    });

    const { result } = renderHook(() =>
      useViewModelInstance(mockRiveFile, { artboardName: 'MissingArtboard' })
    );

    expect(result.current).toBeNull();
  });

  it('should throw when artboardName not found and required is true', () => {
    const mockRiveFile = createMockRiveFile({
      artboardViewModels: {},
    });

    expect(() =>
      renderHook(() =>
        useViewModelInstance(mockRiveFile, {
          artboardName: 'MissingArtboard',
          required: true,
        })
      )
    ).toThrow("Artboard 'MissingArtboard' not found or has no ViewModel");
  });

  it('should call onInit when instance is created with instanceName parameter', () => {
    const personInstance = createMockViewModelInstance();
    const defaultViewModel = createMockViewModel({
      namedInstances: { PersonInstance: personInstance },
    });
    const onInit = jest.fn();

    const mockRiveFile = createMockRiveFile({ defaultViewModel });

    renderHook(() =>
      useViewModelInstance(mockRiveFile, {
        instanceName: 'PersonInstance',
        onInit,
      })
    );

    expect(onInit).toHaveBeenCalledWith(personInstance);
  });
});

describe('useViewModelInstance - RiveFile with artboardName parameter', () => {
  it('should use artboardName to get ViewModel from specific artboard', () => {
    const mainInstance = createMockViewModelInstance();
    const mainArtboardViewModel = createMockViewModel({
      defaultInstance: mainInstance,
    });

    const mockRiveFile = createMockRiveFile({
      artboardViewModels: { MainArtboard: mainArtboardViewModel },
    });

    const { result } = renderHook(() =>
      useViewModelInstance(mockRiveFile, { artboardName: 'MainArtboard' })
    );

    expect(mockRiveFile.defaultArtboardViewModel).toHaveBeenCalledWith({
      type: 'name',
      name: 'MainArtboard',
    });
    expect(mainArtboardViewModel.createDefaultInstance).toHaveBeenCalled();
    expect(result.current).toBe(mainInstance);
  });

  it('should combine artboardName and instanceName to get specific instance from specific artboard', () => {
    const specificInstance = createMockViewModelInstance();
    const mainArtboardViewModel = createMockViewModel({
      namedInstances: { SpecificInstance: specificInstance },
    });

    const mockRiveFile = createMockRiveFile({
      artboardViewModels: { MainArtboard: mainArtboardViewModel },
    });

    const { result } = renderHook(() =>
      useViewModelInstance(mockRiveFile, {
        artboardName: 'MainArtboard',
        instanceName: 'SpecificInstance',
      })
    );

    expect(mockRiveFile.defaultArtboardViewModel).toHaveBeenCalledWith({
      type: 'name',
      name: 'MainArtboard',
    });
    expect(mainArtboardViewModel.createInstanceByName).toHaveBeenCalledWith(
      'SpecificInstance'
    );
    expect(result.current).toBe(specificInstance);
  });
});

describe('useViewModelInstance - RiveFile with viewModelName parameter', () => {
  it('should use viewModelByName when viewModelName is provided', () => {
    const settingsInstance = createMockViewModelInstance();
    const settingsViewModel = createMockViewModel({
      defaultInstance: settingsInstance,
    });

    const mockRiveFile = createMockRiveFile({
      namedViewModels: { Settings: settingsViewModel },
    });

    const { result } = renderHook(() =>
      useViewModelInstance(mockRiveFile, { viewModelName: 'Settings' })
    );

    expect(mockRiveFile.viewModelByName).toHaveBeenCalledWith('Settings');
    expect(mockRiveFile.defaultArtboardViewModel).not.toHaveBeenCalled();
    expect(settingsViewModel.createDefaultInstance).toHaveBeenCalled();
    expect(result.current).toBe(settingsInstance);
  });

  it('should return null when viewModelName not found and required is false', () => {
    const mockRiveFile = createMockRiveFile({
      namedViewModels: {},
    });

    const { result } = renderHook(() =>
      useViewModelInstance(mockRiveFile, { viewModelName: 'NonExistent' })
    );

    expect(result.current).toBeNull();
  });

  it('should throw when viewModelName not found and required is true', () => {
    const mockRiveFile = createMockRiveFile({
      namedViewModels: {},
    });

    expect(() =>
      renderHook(() =>
        useViewModelInstance(mockRiveFile, {
          viewModelName: 'NonExistent',
          required: true,
        })
      )
    ).toThrow("ViewModel 'NonExistent' not found");
  });

  it('should combine viewModelName and instanceName to get specific instance', () => {
    const specificInstance = createMockViewModelInstance();
    const settingsViewModel = createMockViewModel({
      namedInstances: { UserSettings: specificInstance },
    });

    const mockRiveFile = createMockRiveFile({
      namedViewModels: { Settings: settingsViewModel },
    });

    const { result } = renderHook(() =>
      useViewModelInstance(mockRiveFile, {
        viewModelName: 'Settings',
        instanceName: 'UserSettings',
      })
    );

    expect(mockRiveFile.viewModelByName).toHaveBeenCalledWith('Settings');
    expect(settingsViewModel.createInstanceByName).toHaveBeenCalledWith(
      'UserSettings'
    );
    expect(result.current).toBe(specificInstance);
  });
});

describe('useViewModelInstance - ViewModel source', () => {
  it('should use createInstanceByName when name is provided with ViewModel', () => {
    const namedInstance = createMockViewModelInstance();
    const mockViewModel = createMockViewModel({
      namedInstances: { Gordon: namedInstance },
    });

    const { result } = renderHook(() =>
      useViewModelInstance(mockViewModel, { name: 'Gordon' })
    );

    expect(mockViewModel.createInstanceByName).toHaveBeenCalledWith('Gordon');
    expect(mockViewModel.createDefaultInstance).not.toHaveBeenCalled();
    expect(result.current).toBe(namedInstance);
  });

  it('should use createInstance when useNew is true', () => {
    const newInstance = createMockViewModelInstance();
    const mockViewModel = createMockViewModel();
    (mockViewModel.createInstance as jest.Mock).mockReturnValue(newInstance);

    const { result } = renderHook(() =>
      useViewModelInstance(mockViewModel, { useNew: true })
    );

    expect(mockViewModel.createInstance).toHaveBeenCalled();
    expect(mockViewModel.createDefaultInstance).not.toHaveBeenCalled();
    expect(result.current).toBe(newInstance);
  });

  it('should use createDefaultInstance when no params provided', () => {
    const defaultInstance = createMockViewModelInstance();
    const mockViewModel = createMockViewModel({ defaultInstance });

    const { result } = renderHook(() => useViewModelInstance(mockViewModel));

    expect(mockViewModel.createDefaultInstance).toHaveBeenCalled();
    expect(result.current).toBe(defaultInstance);
  });
});
