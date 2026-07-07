import React from 'react';
import {
  renderHook,
  render,
  waitFor,
  act,
} from '@testing-library/react-native';
import { useViewModelInstanceAsync } from '../useViewModelInstanceAsync';
import type { RiveFile } from '../../specs/RiveFile.nitro';
import type { ViewModel, ViewModelInstance } from '../../specs/ViewModel.nitro';
import type { ArtboardBy } from '../../specs/ArtboardBy';

function createMockViewModelInstance(name = 'TestInstance'): ViewModelInstance {
  return {
    instanceName: name,
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
    viewModelAsync: jest.fn(),
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
    createInstanceByNameAsync: jest.fn(
      async (name: string) => options?.namedInstances?.[name]
    ),
    createDefaultInstanceAsync: jest.fn(async () => options?.defaultInstance),
    createBlankInstanceAsync: jest.fn(async () => options?.blankInstance),
    getPropertiesAsync: jest.fn(),
    getPropertyCountAsync: jest.fn(),
    getInstanceCountAsync: jest.fn(),
  } as any;
}

function createMockRiveFile(options?: {
  defaultViewModel?: ViewModel;
  artboardViewModels?: Record<string, ViewModel>;
  namedViewModels?: Record<string, ViewModel>;
}): RiveFile {
  return {
    dispose: jest.fn(),
    getBindableArtboard: jest.fn(),
    viewModelByNameAsync: jest.fn(
      async (name: string) => options?.namedViewModels?.[name]
    ),
    defaultArtboardViewModelAsync: jest.fn(async (artboardBy?: ArtboardBy) => {
      if (artboardBy?.name && options?.artboardViewModels) {
        return options.artboardViewModels[artboardBy.name];
      }
      return options?.defaultViewModel;
    }),
  } as any;
}

describe('useViewModelInstanceAsync - RiveFile source', () => {
  it('is loading on first render, then resolves the default instance', async () => {
    const defaultInstance = createMockViewModelInstance();
    const defaultViewModel = createMockViewModel({ defaultInstance });
    const mockRiveFile = createMockRiveFile({ defaultViewModel });

    const { result } = renderHook(() =>
      useViewModelInstanceAsync(mockRiveFile)
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.instance).toBeUndefined();
    expect(result.current.error).toBeNull();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.instance).toBe(defaultInstance);
    expect(result.current.error).toBeNull();
    expect(defaultViewModel.createDefaultInstanceAsync).toHaveBeenCalled();
  });

  it('resolves a named instance via createInstanceByNameAsync', async () => {
    const personInstance = createMockViewModelInstance('Person');
    const defaultViewModel = createMockViewModel({
      namedInstances: { PersonInstance: personInstance },
    });
    const mockRiveFile = createMockRiveFile({ defaultViewModel });

    const { result } = renderHook(() =>
      useViewModelInstanceAsync(mockRiveFile, {
        instanceName: 'PersonInstance',
      })
    );

    await waitFor(() => expect(result.current.instance).toBe(personInstance));
    expect(defaultViewModel.createInstanceByNameAsync).toHaveBeenCalledWith(
      'PersonInstance'
    );
    expect(result.current.error).toBeNull();
  });

  it('resolves the ViewModel for a specific artboard', async () => {
    const mainInstance = createMockViewModelInstance('Main');
    const mainArtboardViewModel = createMockViewModel({
      defaultInstance: mainInstance,
    });
    const mockRiveFile = createMockRiveFile({
      artboardViewModels: { MainArtboard: mainArtboardViewModel },
    });

    const { result } = renderHook(() =>
      useViewModelInstanceAsync(mockRiveFile, { artboardName: 'MainArtboard' })
    );

    await waitFor(() => expect(result.current.instance).toBe(mainInstance));
    expect(mockRiveFile.defaultArtboardViewModelAsync).toHaveBeenCalledWith({
      type: 'name',
      name: 'MainArtboard',
    });
  });

  it('resolves a ViewModel by name', async () => {
    const settingsInstance = createMockViewModelInstance('Settings');
    const settingsViewModel = createMockViewModel({
      defaultInstance: settingsInstance,
    });
    const mockRiveFile = createMockRiveFile({
      namedViewModels: { Settings: settingsViewModel },
    });

    const { result } = renderHook(() =>
      useViewModelInstanceAsync(mockRiveFile, { viewModelName: 'Settings' })
    );

    await waitFor(() => expect(result.current.instance).toBe(settingsInstance));
    expect(mockRiveFile.viewModelByNameAsync).toHaveBeenCalledWith('Settings');
    expect(mockRiveFile.defaultArtboardViewModelAsync).not.toHaveBeenCalled();
  });

  it('sets an error when the instance name is not found (not required)', async () => {
    const defaultViewModel = createMockViewModel({ namedInstances: {} });
    const mockRiveFile = createMockRiveFile({ defaultViewModel });

    const { result } = renderHook(() =>
      useViewModelInstanceAsync(mockRiveFile, { instanceName: 'NonExistent' })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.instance).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain('NonExistent');
  });

  it('attaches the native cause when createInstanceByNameAsync rejects', async () => {
    // A rejection is a real creation failure — keep the clean "not found"
    // message but preserve the native diagnostic as `error.cause`.
    const nativeError = new Error(
      'invalidViewModelInstance("Could not create ...")'
    );
    const defaultViewModel = createMockViewModel({});
    (defaultViewModel.createInstanceByNameAsync as jest.Mock).mockRejectedValue(
      nativeError
    );
    const mockRiveFile = createMockRiveFile({ defaultViewModel });

    const { result } = renderHook(() =>
      useViewModelInstanceAsync(mockRiveFile, { instanceName: 'Whatever' })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.instance).toBeNull();
    expect(result.current.error?.message).toBe(
      "ViewModel instance 'Whatever' not found"
    );
    expect(result.current.error?.cause).toBe(nativeError);
  });

  it('has no cause when a missing instance resolves to null (not a rejection)', async () => {
    const defaultViewModel = createMockViewModel({ namedInstances: {} });
    const mockRiveFile = createMockRiveFile({ defaultViewModel });

    const { result } = renderHook(() =>
      useViewModelInstanceAsync(mockRiveFile, { instanceName: 'Missing' })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error?.message).toBe(
      "ViewModel instance 'Missing' not found"
    );
    expect(result.current.error?.cause).toBeUndefined();
  });

  it('resolves null with no error when the artboard has no ViewModel', async () => {
    const mockRiveFile = createMockRiveFile({});

    const { result } = renderHook(() =>
      useViewModelInstanceAsync(mockRiveFile)
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.instance).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('maps an artboard-lookup rejection to the not-found error', async () => {
    // Both native platforms *throw* on an unknown artboard name rather than
    // resolving undefined, so the rejection must map to the friendly message.
    const mockRiveFile = createMockRiveFile({});
    (mockRiveFile.defaultArtboardViewModelAsync as jest.Mock).mockRejectedValue(
      new Error('Artboard not found in file')
    );

    const { result } = renderHook(() =>
      useViewModelInstanceAsync(mockRiveFile, { artboardName: 'NonExistent' })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.instance).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe(
      "Artboard 'NonExistent' not found or has no ViewModel"
    );
  });

  it('propagates a rejection unchanged when no artboardName was given', async () => {
    const mockRiveFile = createMockRiveFile({});
    (mockRiveFile.defaultArtboardViewModelAsync as jest.Mock).mockRejectedValue(
      new Error('native boom')
    );

    const { result } = renderHook(() =>
      useViewModelInstanceAsync(mockRiveFile)
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.instance).toBeNull();
    expect(result.current.error?.message).toBe('native boom');
  });
});

describe('useViewModelInstanceAsync - ViewModel source', () => {
  it('uses createDefaultInstanceAsync by default', async () => {
    const defaultInstance = createMockViewModelInstance();
    const mockViewModel = createMockViewModel({ defaultInstance });

    const { result } = renderHook(() =>
      useViewModelInstanceAsync(mockViewModel)
    );

    await waitFor(() => expect(result.current.instance).toBe(defaultInstance));
    expect(mockViewModel.createDefaultInstanceAsync).toHaveBeenCalled();
  });

  it('uses createBlankInstanceAsync when useNew is true', async () => {
    const blankInstance = createMockViewModelInstance('Blank');
    const mockViewModel = createMockViewModel({ blankInstance });

    const { result } = renderHook(() =>
      useViewModelInstanceAsync(mockViewModel, { useNew: true })
    );

    await waitFor(() => expect(result.current.instance).toBe(blankInstance));
    expect(mockViewModel.createBlankInstanceAsync).toHaveBeenCalled();
    expect(mockViewModel.createDefaultInstanceAsync).not.toHaveBeenCalled();
  });

  it('uses createInstanceByNameAsync when name is provided', async () => {
    const namedInstance = createMockViewModelInstance('Gordon');
    const mockViewModel = createMockViewModel({
      namedInstances: { Gordon: namedInstance },
    });

    const { result } = renderHook(() =>
      useViewModelInstanceAsync(mockViewModel, { name: 'Gordon' })
    );

    await waitFor(() => expect(result.current.instance).toBe(namedInstance));
    expect(mockViewModel.createInstanceByNameAsync).toHaveBeenCalledWith(
      'Gordon'
    );
  });
});

describe('useViewModelInstanceAsync - null vs undefined source', () => {
  it('settles to a terminal null when the source is null (e.g. file load failed)', async () => {
    const { result } = renderHook(() => useViewModelInstanceAsync(null));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.instance).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('stays in the loading state when the source is undefined (still resolving)', async () => {
    const { result } = renderHook(() => useViewModelInstanceAsync(undefined));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.instance).toBeUndefined();

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.instance).toBeUndefined();
  });
});

describe('useViewModelInstanceAsync - onInit', () => {
  it('calls onInit with the resolved instance', async () => {
    const defaultInstance = createMockViewModelInstance();
    const defaultViewModel = createMockViewModel({ defaultInstance });
    const mockRiveFile = createMockRiveFile({ defaultViewModel });
    const onInit = jest.fn();

    const { result } = renderHook(() =>
      useViewModelInstanceAsync(mockRiveFile, { onInit })
    );

    await waitFor(() => expect(result.current.instance).toBe(defaultInstance));
    expect(onInit).toHaveBeenCalledWith(defaultInstance);
    expect(onInit).toHaveBeenCalledTimes(1);
  });

  it('surfaces an onInit throw as the error result', async () => {
    const defaultInstance = createMockViewModelInstance();
    const defaultViewModel = createMockViewModel({ defaultInstance });
    const mockRiveFile = createMockRiveFile({ defaultViewModel });

    const { result } = renderHook(() =>
      useViewModelInstanceAsync(mockRiveFile, {
        onInit: () => {
          throw new Error('init boom');
        },
      })
    );

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect(result.current.error?.message).toBe('init boom');
    expect(result.current.instance).toBeNull();
    expect(defaultInstance.dispose).toHaveBeenCalled();
  });
});

describe('useViewModelInstanceAsync - disposal', () => {
  it('disposes the instance on unmount', async () => {
    const defaultInstance = createMockViewModelInstance();
    const defaultViewModel = createMockViewModel({ defaultInstance });
    const mockRiveFile = createMockRiveFile({ defaultViewModel });

    const { result, unmount } = renderHook(() =>
      useViewModelInstanceAsync(mockRiveFile)
    );

    await waitFor(() => expect(result.current.instance).toBe(defaultInstance));
    unmount();
    expect(defaultInstance.dispose).toHaveBeenCalled();
  });

  it('disposes a late-resolving instance when unmounted before resolution', async () => {
    const defaultInstance = createMockViewModelInstance();
    const defaultViewModel = createMockViewModel();
    let resolveCreate: (v: ViewModelInstance) => void = () => {};
    (defaultViewModel.createDefaultInstanceAsync as jest.Mock).mockReturnValue(
      new Promise<ViewModelInstance>((resolve) => {
        resolveCreate = resolve;
      })
    );
    const mockRiveFile = createMockRiveFile({ defaultViewModel });

    const { unmount } = renderHook(() =>
      useViewModelInstanceAsync(mockRiveFile)
    );

    unmount();

    await act(async () => {
      resolveCreate(defaultInstance);
      await Promise.resolve();
    });

    expect(defaultInstance.dispose).toHaveBeenCalled();
  });

  it('disposes the previous instance when the source changes', async () => {
    const instanceA = createMockViewModelInstance('A');
    const fileA = createMockRiveFile({
      defaultViewModel: createMockViewModel({ defaultInstance: instanceA }),
    });
    const instanceB = createMockViewModelInstance('B');
    const fileB = createMockRiveFile({
      defaultViewModel: createMockViewModel({ defaultInstance: instanceB }),
    });

    const { result, rerender } = renderHook(
      ({ file }: { file: RiveFile }) => useViewModelInstanceAsync(file),
      { initialProps: { file: fileA } }
    );

    await waitFor(() => expect(result.current.instance).toBe(instanceA));

    await act(async () => {
      rerender({ file: fileB });
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.instance).toBe(instanceB));
    expect(instanceA.dispose).toHaveBeenCalled();
  });
});

describe('useViewModelInstanceAsync - required', () => {
  class ErrorBoundary extends React.Component<
    { onError: (e: Error) => void; children?: React.ReactNode },
    { hasError: boolean }
  > {
    state = { hasError: false };
    static getDerivedStateFromError() {
      return { hasError: true };
    }
    componentDidCatch(error: Error) {
      this.props.onError(error);
    }
    render() {
      return this.state.hasError ? null : this.props.children;
    }
  }

  function Probe({ source }: { source: RiveFile }) {
    useViewModelInstanceAsync(source, {
      viewModelName: 'NonExistent',
      required: true,
    });
    return null;
  }

  it('throws (caught by an Error Boundary) once it resolves to null', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const mockRiveFile = createMockRiveFile({ namedViewModels: {} });
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <Probe source={mockRiveFile} />
      </ErrorBoundary>
    );

    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect((onError.mock.calls[0][0] as Error).message).toContain(
      'NonExistent'
    );
    consoleError.mockRestore();
  });
});
