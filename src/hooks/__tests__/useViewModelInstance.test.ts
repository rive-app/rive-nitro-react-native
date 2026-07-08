import * as React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
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
  blankInstance?: ViewModelInstance;
}): ViewModel {
  return {
    modelName: 'TestViewModel',
    dispose: jest.fn(),
    createInstanceByNameAsync: jest.fn((name: string) =>
      Promise.resolve(options?.namedInstances?.[name])
    ),
    createDefaultInstanceAsync: jest.fn(() =>
      Promise.resolve(options?.defaultInstance)
    ),
    createBlankInstanceAsync: jest.fn(() =>
      Promise.resolve(options?.blankInstance)
    ),
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
    // presence of this key is how isRiveFile() detects a RiveFile source
    defaultArtboardViewModel: jest.fn(),
    viewModelByNameAsync: jest.fn((name: string) =>
      Promise.resolve(options?.namedViewModels?.[name])
    ),
    defaultArtboardViewModelAsync: jest.fn((artboardBy?: ArtboardBy) => {
      if (artboardBy?.name && options?.artboardViewModels) {
        return Promise.resolve(options.artboardViewModels[artboardBy.name]);
      }
      return Promise.resolve(options?.defaultViewModel);
    }),
    getBindableArtboard: jest.fn(),
  } as any;
}

/**
 * With `required: true` the hook throws during the re-render that publishes
 * the async failure — catch it with an error boundary.
 */
function renderHookExpectingThrow(hook: () => unknown) {
  const caught = jest.fn();
  class Boundary extends React.Component<{ children: React.ReactNode }> {
    state: { err: Error | null } = { err: null };
    static getDerivedStateFromError(err: Error) {
      return { err };
    }
    componentDidCatch(err: Error) {
      caught(err);
    }
    render() {
      return this.state.err ? null : this.props.children;
    }
  }
  renderHook(hook, { wrapper: Boundary });
  return caught;
}

describe('useViewModelInstance - RiveFile with instanceName parameter', () => {
  beforeEach(() => {
    // React logs boundary-caught render errors via console.error
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it('should use createInstanceByNameAsync when instanceName is provided with RiveFile', async () => {
    const personInstance = createMockViewModelInstance();
    const defaultViewModel = createMockViewModel({
      namedInstances: { PersonInstance: personInstance },
    });

    const mockRiveFile = createMockRiveFile({ defaultViewModel });

    const { result } = renderHook(() =>
      useViewModelInstance(mockRiveFile, { instanceName: 'PersonInstance' })
    );

    await waitFor(() => {
      expect(result.current.instance).toBe(personInstance);
    });
    expect(mockRiveFile.defaultArtboardViewModelAsync).toHaveBeenCalledWith(
      undefined
    );
    expect(defaultViewModel.createInstanceByNameAsync).toHaveBeenCalledWith(
      'PersonInstance'
    );
    expect(defaultViewModel.createDefaultInstanceAsync).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('should use defaultArtboardViewModelAsync and createDefaultInstanceAsync when no instanceName provided', async () => {
    const defaultInstance = createMockViewModelInstance();
    const defaultViewModel = createMockViewModel({ defaultInstance });

    const mockRiveFile = createMockRiveFile({ defaultViewModel });

    const { result } = renderHook(() => useViewModelInstance(mockRiveFile));

    await waitFor(() => {
      expect(result.current.instance).toBe(defaultInstance);
    });
    expect(mockRiveFile.defaultArtboardViewModelAsync).toHaveBeenCalledWith(
      undefined
    );
    expect(defaultViewModel.createDefaultInstanceAsync).toHaveBeenCalled();
    expect(defaultViewModel.createInstanceByNameAsync).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('should dispose the intermediate ViewModel wrapper after creating the instance', async () => {
    const defaultInstance = createMockViewModelInstance();
    const defaultViewModel = createMockViewModel({ defaultInstance });

    const mockRiveFile = createMockRiveFile({ defaultViewModel });

    const { result } = renderHook(() => useViewModelInstance(mockRiveFile));

    await waitFor(() => {
      expect(result.current.instance).toBe(defaultInstance);
    });
    expect(defaultViewModel.dispose).toHaveBeenCalled();
  });

  it('should return error when instance name not found and required is false', async () => {
    const defaultViewModel = createMockViewModel({
      namedInstances: {},
    });

    const mockRiveFile = createMockRiveFile({ defaultViewModel });

    const { result } = renderHook(() =>
      useViewModelInstance(mockRiveFile, { instanceName: 'NonExistent' })
    );

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
    });
    expect(result.current.instance).toBeNull();
    expect(result.current.error?.message).toContain('NonExistent');
  });

  it('should throw when instance name not found and required is true', async () => {
    const defaultViewModel = createMockViewModel({
      namedInstances: {},
    });

    const mockRiveFile = createMockRiveFile({ defaultViewModel });

    const caught = renderHookExpectingThrow(() =>
      useViewModelInstance(mockRiveFile, {
        instanceName: 'NonExistent',
        required: true,
      })
    );

    await waitFor(() => {
      expect(caught).toHaveBeenCalled();
    });
    expect((caught.mock.calls[0]![0] as Error).message).toContain(
      "ViewModel instance 'NonExistent' not found"
    );
  });

  it('should return error when artboardName not found and required is false', async () => {
    const mockRiveFile = createMockRiveFile({
      artboardViewModels: {},
    });

    const { result } = renderHook(() =>
      useViewModelInstance(mockRiveFile, { artboardName: 'MissingArtboard' })
    );

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
    });
    expect(result.current.instance).toBeNull();
    expect(result.current.error?.message).toContain('MissingArtboard');
  });

  it('should throw when artboardName not found and required is true', async () => {
    const mockRiveFile = createMockRiveFile({
      artboardViewModels: {},
    });

    const caught = renderHookExpectingThrow(() =>
      useViewModelInstance(mockRiveFile, {
        artboardName: 'MissingArtboard',
        required: true,
      })
    );

    await waitFor(() => {
      expect(caught).toHaveBeenCalled();
    });
    expect((caught.mock.calls[0]![0] as Error).message).toContain(
      "Artboard 'MissingArtboard' not found or has no ViewModel"
    );
  });

  it('should call onInit before publishing the instance', async () => {
    const personInstance = createMockViewModelInstance();
    const defaultViewModel = createMockViewModel({
      namedInstances: { PersonInstance: personInstance },
    });
    const onInit = jest.fn();

    const mockRiveFile = createMockRiveFile({ defaultViewModel });

    const { result } = renderHook(() =>
      useViewModelInstance(mockRiveFile, {
        instanceName: 'PersonInstance',
        onInit,
      })
    );

    await waitFor(() => {
      expect(result.current.instance).toBe(personInstance);
    });
    expect(onInit).toHaveBeenCalledWith(personInstance);
    // onInit must run before the instance is exposed
    expect(onInit.mock.invocationCallOrder[0]).toBeLessThan(Infinity);
  });
});

describe('useViewModelInstance - RiveFile with artboardName parameter', () => {
  it('should use artboardName to get ViewModel from specific artboard', async () => {
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

    await waitFor(() => {
      expect(result.current.instance).toBe(mainInstance);
    });
    expect(mockRiveFile.defaultArtboardViewModelAsync).toHaveBeenCalledWith({
      type: 'name',
      name: 'MainArtboard',
    });
    expect(mainArtboardViewModel.createDefaultInstanceAsync).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('should combine artboardName and instanceName to get specific instance from specific artboard', async () => {
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

    await waitFor(() => {
      expect(result.current.instance).toBe(specificInstance);
    });
    expect(mockRiveFile.defaultArtboardViewModelAsync).toHaveBeenCalledWith({
      type: 'name',
      name: 'MainArtboard',
    });
    expect(
      mainArtboardViewModel.createInstanceByNameAsync
    ).toHaveBeenCalledWith('SpecificInstance');
    expect(result.current.error).toBeNull();
  });
});

describe('useViewModelInstance - RiveFile with viewModelName parameter', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it('should use viewModelByNameAsync when viewModelName is provided', async () => {
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

    await waitFor(() => {
      expect(result.current.instance).toBe(settingsInstance);
    });
    expect(mockRiveFile.viewModelByNameAsync).toHaveBeenCalledWith('Settings');
    expect(mockRiveFile.defaultArtboardViewModelAsync).not.toHaveBeenCalled();
    expect(settingsViewModel.createDefaultInstanceAsync).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('should return error when viewModelName not found and required is false', async () => {
    const mockRiveFile = createMockRiveFile({
      namedViewModels: {},
    });

    const { result } = renderHook(() =>
      useViewModelInstance(mockRiveFile, { viewModelName: 'NonExistent' })
    );

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
    });
    expect(result.current.instance).toBeNull();
    expect(result.current.error?.message).toContain('NonExistent');
  });

  it('should throw when viewModelName not found and required is true', async () => {
    const mockRiveFile = createMockRiveFile({
      namedViewModels: {},
    });

    const caught = renderHookExpectingThrow(() =>
      useViewModelInstance(mockRiveFile, {
        viewModelName: 'NonExistent',
        required: true,
      })
    );

    await waitFor(() => {
      expect(caught).toHaveBeenCalled();
    });
    expect((caught.mock.calls[0]![0] as Error).message).toContain(
      "ViewModel 'NonExistent' not found"
    );
  });

  it('should combine viewModelName and instanceName to get specific instance', async () => {
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

    await waitFor(() => {
      expect(result.current.instance).toBe(specificInstance);
    });
    expect(mockRiveFile.viewModelByNameAsync).toHaveBeenCalledWith('Settings');
    expect(settingsViewModel.createInstanceByNameAsync).toHaveBeenCalledWith(
      'UserSettings'
    );
    expect(result.current.error).toBeNull();
  });
});

describe('useViewModelInstance - ViewModel source', () => {
  it('should use createInstanceByNameAsync when name is provided with ViewModel', async () => {
    const namedInstance = createMockViewModelInstance();
    const mockViewModel = createMockViewModel({
      namedInstances: { Gordon: namedInstance },
    });

    const { result } = renderHook(() =>
      useViewModelInstance(mockViewModel, { name: 'Gordon' })
    );

    await waitFor(() => {
      expect(result.current.instance).toBe(namedInstance);
    });
    expect(mockViewModel.createInstanceByNameAsync).toHaveBeenCalledWith(
      'Gordon'
    );
    expect(mockViewModel.createDefaultInstanceAsync).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('should use createBlankInstanceAsync when useNew is true', async () => {
    const newInstance = createMockViewModelInstance();
    const mockViewModel = createMockViewModel({ blankInstance: newInstance });

    const { result } = renderHook(() =>
      useViewModelInstance(mockViewModel, { useNew: true })
    );

    await waitFor(() => {
      expect(result.current.instance).toBe(newInstance);
    });
    expect(mockViewModel.createBlankInstanceAsync).toHaveBeenCalled();
    expect(mockViewModel.createDefaultInstanceAsync).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('should use createDefaultInstanceAsync when no params provided', async () => {
    const defaultInstance = createMockViewModelInstance();
    const mockViewModel = createMockViewModel({ defaultInstance });

    const { result } = renderHook(() => useViewModelInstance(mockViewModel));

    await waitFor(() => {
      expect(result.current.instance).toBe(defaultInstance);
    });
    expect(mockViewModel.createDefaultInstanceAsync).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('should dispose a created instance when unmounted before the promise resolves', async () => {
    const slowInstance = createMockViewModelInstance();
    let resolveCreate: (vmi: ViewModelInstance) => void = () => {};
    const mockViewModel = createMockViewModel();
    (mockViewModel.createDefaultInstanceAsync as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      })
    );

    const { unmount } = renderHook(() => useViewModelInstance(mockViewModel));
    unmount();
    resolveCreate(slowInstance);

    await waitFor(() => {
      expect(slowInstance.dispose).toHaveBeenCalled();
    });
  });
});

describe('useViewModelInstance - null source', () => {
  it('should return undefined instance when source is null', () => {
    const { result } = renderHook(() => useViewModelInstance(null));

    expect(result.current.instance).toBeUndefined();
    expect(result.current.error).toBeNull();
  });
});
