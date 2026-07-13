import React from 'react';
import {
  renderHook,
  render,
  waitFor,
  act,
} from '@testing-library/react-native';
import {
  useViewModelInstance,
  type UseViewModelInstanceFileParams,
} from '../useViewModelInstance';
import type { RiveFile } from '../../specs/RiveFile.nitro';
import type { ViewModel, ViewModelInstance } from '../../specs/ViewModel.nitro';
import type { ArtboardBy } from '../../specs/ArtboardBy';
import type { RiveViewRef } from '../../index';

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

describe('useViewModelInstance async - RiveFile source', () => {
  it('is loading on first render, then resolves the default instance', async () => {
    const defaultInstance = createMockViewModelInstance();
    const defaultViewModel = createMockViewModel({ defaultInstance });
    const mockRiveFile = createMockRiveFile({ defaultViewModel });

    const { result } = renderHook(() =>
      useViewModelInstance(mockRiveFile, { async: true })
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
      useViewModelInstance(mockRiveFile, {
        async: true,
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
      useViewModelInstance(mockRiveFile, {
        async: true,
        artboardName: 'MainArtboard',
      })
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
      useViewModelInstance(mockRiveFile, {
        async: true,
        viewModelName: 'Settings',
      })
    );

    await waitFor(() => expect(result.current.instance).toBe(settingsInstance));
    expect(mockRiveFile.viewModelByNameAsync).toHaveBeenCalledWith('Settings');
    expect(mockRiveFile.defaultArtboardViewModelAsync).not.toHaveBeenCalled();
  });

  it('sets an error when the instance name is not found (not required)', async () => {
    const defaultViewModel = createMockViewModel({ namedInstances: {} });
    const mockRiveFile = createMockRiveFile({ defaultViewModel });

    const { result } = renderHook(() =>
      useViewModelInstance(mockRiveFile, {
        async: true,
        instanceName: 'NonExistent',
      })
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
      useViewModelInstance(mockRiveFile, {
        async: true,
        instanceName: 'Whatever',
      })
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
      useViewModelInstance(mockRiveFile, {
        async: true,
        instanceName: 'Missing',
      })
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
      useViewModelInstance(mockRiveFile, { async: true })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.instance).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('maps an artboard-lookup rejection to the not-found error', async () => {
    // The experimental backend (feat/rive-ios-experimental) *throws* on an
    // unknown artboard name while this backend resolves undefined; a rejection
    // must map to the same friendly message the resolve-undefined path
    // produces.
    const mockRiveFile = createMockRiveFile({});
    (mockRiveFile.defaultArtboardViewModelAsync as jest.Mock).mockRejectedValue(
      new Error('Artboard not found in file')
    );

    const { result } = renderHook(() =>
      useViewModelInstance(mockRiveFile, {
        async: true,
        artboardName: 'NonExistent',
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.instance).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe(
      "Artboard 'NonExistent' not found or has no ViewModel"
    );
    // The native diagnostic must survive as `cause`, not be swallowed.
    expect((result.current.error as Error & { cause?: unknown }).cause).toEqual(
      new Error('Artboard not found in file')
    );
  });

  it('artboard resolve-undefined miss carries no cause', async () => {
    const mockRiveFile = createMockRiveFile({});

    const { result } = renderHook(() =>
      useViewModelInstance(mockRiveFile, {
        async: true,
        artboardName: 'NonExistent',
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error?.message).toBe(
      "Artboard 'NonExistent' not found or has no ViewModel"
    );
    expect(
      (result.current.error as Error & { cause?: unknown }).cause
    ).toBeUndefined();
  });

  it('preserves the value of a non-Error rejection in the error message', async () => {
    const defaultViewModel = createMockViewModel();
    (
      defaultViewModel.createDefaultInstanceAsync as jest.Mock
    ).mockRejectedValue('file was disposed');
    const mockRiveFile = createMockRiveFile({ defaultViewModel });

    const { result } = renderHook(() =>
      useViewModelInstance(mockRiveFile, { async: true })
    );

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect(result.current.error?.message).toBe('file was disposed');
  });

  it('propagates a rejection unchanged when no artboardName was given', async () => {
    const mockRiveFile = createMockRiveFile({});
    (mockRiveFile.defaultArtboardViewModelAsync as jest.Mock).mockRejectedValue(
      new Error('native boom')
    );

    const { result } = renderHook(() =>
      useViewModelInstance(mockRiveFile, { async: true })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.instance).toBeNull();
    expect(result.current.error?.message).toBe('native boom');
  });
});

describe('useViewModelInstance async - ViewModel source', () => {
  it('uses createDefaultInstanceAsync by default', async () => {
    const defaultInstance = createMockViewModelInstance();
    const mockViewModel = createMockViewModel({ defaultInstance });

    const { result } = renderHook(() =>
      useViewModelInstance(mockViewModel, { async: true })
    );

    await waitFor(() => expect(result.current.instance).toBe(defaultInstance));
    expect(mockViewModel.createDefaultInstanceAsync).toHaveBeenCalled();
  });

  it('uses createBlankInstanceAsync when useNew is true', async () => {
    const blankInstance = createMockViewModelInstance('Blank');
    const mockViewModel = createMockViewModel({ blankInstance });

    const { result } = renderHook(() =>
      useViewModelInstance(mockViewModel, {
        async: true,
        useNew: true,
      })
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
      useViewModelInstance(mockViewModel, {
        async: true,
        name: 'Gordon',
      })
    );

    await waitFor(() => expect(result.current.instance).toBe(namedInstance));
    expect(mockViewModel.createInstanceByNameAsync).toHaveBeenCalledWith(
      'Gordon'
    );
  });
});

function createMockRiveViewRef(
  getViewModelInstance: () => ViewModelInstance | null | undefined
): RiveViewRef {
  return { getViewModelInstance: jest.fn(getViewModelInstance) } as any;
}

describe('useViewModelInstance - param type compatibility', () => {
  // These pin overload resolution as much as runtime behavior: a params
  // object built separately widens `async` to boolean, and the exported
  // params types declare `async?: boolean` — both must keep COMPILING and
  // behave per the runtime value (`yarn tsc` is the gate). By design they
  // resolve to the deprecated overloads: the warning's message tells such
  // callers to re-pin with `{ ...params, async: true }`.
  it('accepts a params object with a widened boolean async', async () => {
    const defaultInstance = createMockViewModelInstance();
    const defaultViewModel = createMockViewModel({ defaultInstance });
    const mockRiveFile = createMockRiveFile({ defaultViewModel });

    const params = { async: true }; // widens to { async: boolean }
    const { result } = renderHook(() =>
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- widened async resolves to the deprecated overload by design; runtime still honors the value
      useViewModelInstance(mockRiveFile, params)
    );

    await waitFor(() => expect(result.current.instance).toBe(defaultInstance));
  });

  it('accepts a value of the exported file-params type with a nullable source', async () => {
    const defaultInstance = createMockViewModelInstance();
    const defaultViewModel = createMockViewModel({ defaultInstance });
    const mockRiveFile: RiveFile | null | undefined = createMockRiveFile({
      defaultViewModel,
    });

    const params: UseViewModelInstanceFileParams = { async: true };
    const { result } = renderHook(() =>
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- exported param types carry async?: boolean and resolve to the deprecated overload by design
      useViewModelInstance(mockRiveFile, params)
    );

    await waitFor(() => expect(result.current.instance).toBe(defaultInstance));
  });
});

describe('useViewModelInstance async - RiveViewRef source', () => {
  it('resolves the view-bound instance', async () => {
    const vmi = createMockViewModelInstance();
    const ref = createMockRiveViewRef(() => vmi);

    const { result } = renderHook(() =>
      useViewModelInstance(ref, { async: true })
    );

    await waitFor(() => expect(result.current.instance).toBe(vmi));
    expect(result.current.error).toBeNull();
  });

  it('does not dispose a view-owned instance on unmount', async () => {
    const vmi = createMockViewModelInstance();
    const ref = createMockRiveViewRef(() => vmi);

    const { result, unmount } = renderHook(() =>
      useViewModelInstance(ref, { async: true })
    );

    await waitFor(() => expect(result.current.instance).toBe(vmi));
    unmount();
    expect(vmi.dispose).not.toHaveBeenCalled();
  });

  it('retries until the auto-bound instance appears', async () => {
    // Auto-bind completes a short time after the ref is assigned; the hook
    // must poll rather than settle a terminal null on the first read.
    const vmi = createMockViewModelInstance();
    let calls = 0;
    const ref = createMockRiveViewRef(() => (++calls >= 3 ? vmi : undefined));

    const { result } = renderHook(() =>
      useViewModelInstance(ref, { async: true })
    );

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.instance).toBe(vmi), {
      timeout: 2000,
    });
    expect(calls).toBeGreaterThanOrEqual(3);
  });

  it('stops polling when unmounted before the instance appears', async () => {
    const getVmi = jest.fn((): ViewModelInstance | undefined => undefined);
    const ref = { getViewModelInstance: getVmi } as unknown as RiveViewRef;

    const { unmount } = renderHook(() =>
      useViewModelInstance(ref, { async: true })
    );
    unmount();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 200));
    });
    const callsAfterUnmount = getVmi.mock.calls.length;
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200));
    });
    expect(getVmi.mock.calls.length).toBe(callsAfterUnmount);
  });
});

describe('useViewModelInstance async - null vs undefined source', () => {
  it('settles to a terminal null when the source is null (e.g. file load failed)', async () => {
    const { result } = renderHook(() =>
      useViewModelInstance(null, { async: true })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.instance).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('stays in the loading state when the source is undefined (still resolving)', async () => {
    const { result } = renderHook(() =>
      useViewModelInstance(undefined, { async: true })
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.instance).toBeUndefined();

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.instance).toBeUndefined();
  });
});

describe('useViewModelInstance async - onInit', () => {
  it('calls onInit with the resolved instance', async () => {
    const defaultInstance = createMockViewModelInstance();
    const defaultViewModel = createMockViewModel({ defaultInstance });
    const mockRiveFile = createMockRiveFile({ defaultViewModel });
    const onInit = jest.fn();

    const { result } = renderHook(() =>
      useViewModelInstance(mockRiveFile, {
        async: true,
        onInit,
      })
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
      useViewModelInstance(mockRiveFile, {
        async: true,
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

describe('useViewModelInstance async - disposal', () => {
  it('disposes the instance on unmount', async () => {
    const defaultInstance = createMockViewModelInstance();
    const defaultViewModel = createMockViewModel({ defaultInstance });
    const mockRiveFile = createMockRiveFile({ defaultViewModel });

    const { result, unmount } = renderHook(() =>
      useViewModelInstance(mockRiveFile, { async: true })
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
      useViewModelInstance(mockRiveFile, { async: true })
    );

    unmount();

    await act(async () => {
      resolveCreate(defaultInstance);
      await Promise.resolve();
    });

    expect(defaultInstance.dispose).toHaveBeenCalled();
  });

  it('never commits a frame pairing the new source with the old instance', async () => {
    // On source change the reset must happen during render, not in the
    // effect: otherwise React commits one frame of
    // <RiveView file={fileB} dataBind={instanceA} /> (isLoading false, so
    // consumer guards can't catch it) and then disposes instanceA while it
    // is still the committed dataBind.
    const instanceA = createMockViewModelInstance('A');
    const fileA = createMockRiveFile({
      defaultViewModel: createMockViewModel({ defaultInstance: instanceA }),
    });
    const instanceB = createMockViewModelInstance('B');
    const fileB = createMockRiveFile({
      defaultViewModel: createMockViewModel({ defaultInstance: instanceB }),
    });

    const frames: Array<{
      file: RiveFile;
      instance: ViewModelInstance | null | undefined;
      isLoading: boolean;
    }> = [];
    function Probe({ file }: { file: RiveFile }) {
      const { instance, isLoading } = useViewModelInstance(file, {
        async: true,
      });
      React.useEffect(() => {
        frames.push({ file, instance, isLoading });
      });
      return null;
    }

    const view = render(<Probe file={fileA} />);
    await waitFor(() =>
      expect(frames.some((f) => f.instance === instanceA)).toBe(true)
    );

    await act(async () => {
      view.rerender(<Probe file={fileB} />);
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(frames.some((f) => f.instance === instanceB)).toBe(true)
    );

    const mismatched = frames.filter(
      (f) => f.file === fileB && f.instance === instanceA
    );
    expect(mismatched).toEqual([]);
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
      ({ file }: { file: RiveFile }) =>
        useViewModelInstance(file, { async: true }),
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

describe('useViewModelInstance async - required', () => {
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
    useViewModelInstance(source, {
      async: true,
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
    const message = (onError.mock.calls[0][0] as Error).message;
    expect(message).toContain('NonExistent');
    // Users called useViewModelInstance — the internal hook name must not leak.
    expect(message).toContain('useViewModelInstance:');
    expect(message).not.toContain('useViewModelInstanceAsync');
    consoleError.mockRestore();
  });

  it('names the absent source (not the ViewModel) when required throws for a null source', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const onError = jest.fn();

    function NullSourceProbe() {
      useViewModelInstance(null as RiveFile | null, {
        async: true,
        required: true,
      });
      return null;
    }

    render(
      <ErrorBoundary onError={onError}>
        <NullSourceProbe />
      </ErrorBoundary>
    );

    await waitFor(() => expect(onError).toHaveBeenCalled());
    const message = (onError.mock.calls[0][0] as Error).message;
    // A null source means the file/view failed upstream — pointing users at
    // "Ensure the source has a valid ViewModel" sends them the wrong way.
    expect(message).toContain('useViewModelInstance:');
    expect(message).toMatch(/source is null/i);
    expect(message).toMatch(/useRiveFile|useRive/);
    consoleError.mockRestore();
  });
});

describe('useViewModelInstance - async flag constancy guard', () => {
  it('reports an actionable error when async changes between renders', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const defaultInstance = createMockViewModelInstance();
    // The initial render takes the sync path, so the mock must speak the
    // sync API too (the shared factories only stub the *Async surface).
    const mockRiveFile = {
      ...createMockRiveFile({
        defaultViewModel: createMockViewModel({ defaultInstance }),
      }),
      defaultArtboardViewModel: jest.fn(() => ({
        dispose: jest.fn(),
        createDefaultInstance: jest.fn(() => defaultInstance),
        createInstanceByName: jest.fn(),
        createInstance: jest.fn(),
      })),
    } as unknown as RiveFile;

    const { rerender } = renderHook(
      ({ isAsync }: { isAsync: boolean }) =>
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- dynamic async is the misuse under test
        useViewModelInstance(mockRiveFile, { async: isAsync }),
      { initialProps: { isAsync: false } }
    );

    // Flipping the flag switches hook implementations — React will throw its
    // generic hooks-order invariant; the hook must first explain why.
    expect(() => rerender({ isAsync: true })).toThrow();
    expect(
      consoleError.mock.calls.some((c) =>
        String(c[0]).includes('`async` param changed between renders')
      )
    ).toBe(true);
    consoleError.mockRestore();
  });
});
