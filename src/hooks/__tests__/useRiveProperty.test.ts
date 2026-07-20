import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useRiveProperty } from '../useRiveProperty';
import type { ViewModelInstance } from '../../specs/ViewModel.nitro';

describe('useRiveProperty', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.warn as jest.Mock).mockRestore();
  });

  const createMockProperty = (initialValue: string) => {
    let currentValue = initialValue;
    let listener: ((value: string) => void) | null = null;

    return {
      get value() {
        return currentValue;
      },
      set value(newValue: string) {
        currentValue = newValue;
        listener?.(newValue);
      },
      set: jest.fn((newValue: string) => {
        currentValue = newValue;
        listener?.(newValue);
      }),
      getValueAsync: jest.fn(() => Promise.resolve(currentValue)),
      addListener: jest.fn((callback: (value: string) => void) => {
        listener = callback;
        // Emit the current value immediately on subscribe, matching native behaviour:
        // iOS legacy emits synchronously; new runtime emits via valueStream.
        callback(currentValue);
        return () => {
          listener = null;
        };
      }),
      dispose: jest.fn(),
    };
  };

  const createMockViewModelInstance = (
    propertyMap: Record<string, ReturnType<typeof createMockProperty>>
  ) => {
    return {
      enumProperty: jest.fn((path: string) => propertyMap[path]),
      numberProperty: jest.fn((path: string) => propertyMap[path]),
      stringProperty: jest.fn((path: string) => propertyMap[path]),
      booleanProperty: jest.fn((path: string) => propertyMap[path]),
    } as unknown as ViewModelInstance;
  };

  it('should return initial value delivered via listener (not from a sync read)', () => {
    // Hooks always start undefined; the listener emits the current value immediately
    // on subscribe (synchronously for legacy, via stream for experimental).
    const mockProperty = createMockProperty('Tea');
    const mockInstance = createMockViewModelInstance({
      'favDrink/type': mockProperty,
    });

    const { result } = renderHook(() =>
      useRiveProperty<any, string>(
        mockInstance,
        'favDrink/type',
        (vmi: any, path: string) => vmi.enumProperty(path)
      )
    );

    // The mock's addListener emits 'Tea' synchronously — React batches it with the
    // effect, so the value is available after renderHook (which wraps in act()).
    const [value] = result.current;
    expect(value).toBe('Tea');
  });

  it('should update value when property changes', () => {
    const mockProperty = createMockProperty('Tea');
    const mockInstance = createMockViewModelInstance({
      'favDrink/type': mockProperty,
    });

    const { result } = renderHook(() =>
      useRiveProperty<any, string>(
        mockInstance,
        'favDrink/type',
        (vmi: any, path: string) => vmi.enumProperty(path)
      )
    );

    act(() => {
      mockProperty.value = 'Coffee';
    });

    const [value] = result.current;
    expect(value).toBe('Coffee');
  });

  it('should return undefined when viewModelInstance is null', () => {
    const { result } = renderHook(() =>
      useRiveProperty<any, string>(
        null,
        'favDrink/type',
        (vmi: any, path: string) => vmi.enumProperty(path)
      )
    );

    const [value] = result.current;
    expect(value).toBeUndefined();
  });

  it('should return error when property is not found on a valid instance', () => {
    const mockInstance = createMockViewModelInstance({});

    const { result } = renderHook(() =>
      useRiveProperty<any, string>(
        mockInstance,
        'nonexistent/path',
        (vmi: any, path: string) => vmi.enumProperty(path)
      )
    );

    const [, , error] = result.current;
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toContain('nonexistent/path');
  });

  it('should surface an error when getValueAsync rejects (new runtime: unvalidated handle for a bad path)', async () => {
    // The new runtime returns a wrapper for any path — the bad path
    // is only reported when the command server is asked for the value.
    const rejectingProperty = {
      set: jest.fn(),
      getValueAsync: jest.fn(() =>
        Promise.reject(new Error('Property not found: typo/path'))
      ),
      addListener: jest.fn(() => () => {}),
      dispose: jest.fn(),
    };
    const mockInstance = createMockViewModelInstance({
      'typo/path': rejectingProperty as any,
    });

    const { result } = renderHook(() =>
      useRiveProperty<any, string>(
        mockInstance,
        'typo/path',
        (vmi: any, path: string) => vmi.enumProperty(path)
      )
    );

    await waitFor(() => {
      expect(result.current[2]).toBeInstanceOf(Error);
    });
    expect(result.current[2]?.message).toContain('typo/path');
    expect(result.current[0]).toBeUndefined();
  });

  it('should not crash when setValue is called on an invalid property', () => {
    const mockInstance = createMockViewModelInstance({});

    const { result } = renderHook(() =>
      useRiveProperty<any, string>(
        mockInstance,
        'nonexistent/path',
        (vmi: any, path: string) => vmi.enumProperty(path)
      )
    );

    // Error already set by useEffect (property not found on valid instance)
    expect(result.current[2]).toBeInstanceOf(Error);

    // Calling setValue should be a no-op, not throw
    act(() => {
      const [, setValue] = result.current;
      setValue('Hello');
    });

    // Error unchanged — still the original "not found" error
    expect(result.current[2]).toBeInstanceOf(Error);
    expect(result.current[2]?.message).toContain('nonexistent/path');
  });

  it('should not error when setValue is called before instance is ready', () => {
    // Start with undefined instance (simulates async file loading)
    const { result } = renderHook(
      (props: { instance: ViewModelInstance | undefined }) =>
        useRiveProperty<any, string>(
          props.instance,
          'text',
          (vmi: any, path: string) => vmi.stringProperty(path)
        ),
      { initialProps: { instance: undefined } }
    );

    // setValue should be a no-op, not set an error
    act(() => {
      const [, setValue] = result.current;
      setValue('Hello');
    });

    const [, , error] = result.current;
    expect(error).toBeNull();
  });

  it('should apply value after instance becomes available', () => {
    const mockProperty = createMockProperty('initial');
    const mockInstance = createMockViewModelInstance({
      text: mockProperty,
    });

    // Start with undefined instance
    const { result, rerender } = renderHook(
      (props: { instance: ViewModelInstance | undefined }) =>
        useRiveProperty<any, string>(
          props.instance,
          'text',
          (vmi: any, path: string) => vmi.stringProperty(path)
        ),
      { initialProps: { instance: undefined } }
    );

    const setValueBeforeReady = result.current[1];

    // setValue before ready — should be a no-op
    act(() => {
      setValueBeforeReady('Hello');
    });

    expect(result.current[2]).toBeNull();

    // Instance becomes available
    rerender({ instance: mockInstance });

    // setValue identity must change so useEffect deps re-fire automatically
    const setValueAfterReady = result.current[1];
    expect(setValueAfterReady).not.toBe(setValueBeforeReady);

    // Now setValue should work
    act(() => {
      setValueAfterReady('Hello');
    });

    expect(mockProperty.value).toBe('Hello');
    expect(result.current[2]).toBeNull();
  });

  it('should update value when path changes', () => {
    const teaProperty = createMockProperty('Tea');
    const coffeeProperty = createMockProperty('Coffee');
    const mockInstance = createMockViewModelInstance({
      'drinks/tea': teaProperty,
      'drinks/coffee': coffeeProperty,
    });

    const { result, rerender } = renderHook(
      (props: { path: string }) =>
        useRiveProperty<any, string>(
          mockInstance,
          props.path,
          (vmi: any, p: string) => vmi.enumProperty(p)
        ),
      { initialProps: { path: 'drinks/tea' } }
    );

    expect(result.current[0]).toBe('Tea');

    rerender({ path: 'drinks/coffee' });

    expect(result.current[0]).toBe('Coffee');
  });

  it('should update value when viewModelInstance changes', () => {
    const instance1Property = createMockProperty('Instance1Value');
    const instance2Property = createMockProperty('Instance2Value');
    const mockInstance1 = createMockViewModelInstance({
      'prop/path': instance1Property,
    });
    const mockInstance2 = createMockViewModelInstance({
      'prop/path': instance2Property,
    });

    const { result, rerender } = renderHook(
      (props: { instance: ViewModelInstance }) =>
        useRiveProperty<any, string>(
          props.instance,
          'prop/path',
          (vmi: any, p: string) => vmi.enumProperty(p)
        ),
      { initialProps: { instance: mockInstance1 } }
    );

    expect(result.current[0]).toBe('Instance1Value');

    rerender({ instance: mockInstance2 });

    expect(result.current[0]).toBe('Instance2Value');
  });

  // A setter captured in a stale closure (e.g. an async callback) can fire
  // after its property was disposed by a deps change or unmount. The write
  // must be a no-op: on a disposed native property it throws
  // ("NativeState is null"), which is fatal when uncaught in release.
  describe('stale-closure writes', () => {
    const createDisposeTrackingProperty = (initialValue: string) => {
      let currentValue = initialValue;
      let listener: ((value: string) => void) | null = null;
      const writesAfterDispose: string[] = [];
      let disposed = false;

      return {
        get value() {
          return currentValue;
        },
        set value(newValue: string) {
          if (disposed) {
            writesAfterDispose.push(newValue);
            return;
          }
          currentValue = newValue;
          listener?.(newValue);
        },
        set: jest.fn((newValue: string) => {
          if (disposed) {
            writesAfterDispose.push(newValue);
            return;
          }
          currentValue = newValue;
          listener?.(newValue);
        }),
        getValueAsync: jest.fn(() =>
          disposed
            ? Promise.reject(new Error('disposed'))
            : Promise.resolve(currentValue)
        ),
        addListener: jest.fn((callback: (value: string) => void) => {
          listener = callback;
          callback(currentValue);
          return () => {
            listener = null;
          };
        }),
        dispose: jest.fn(() => {
          disposed = true;
        }),
        get writesAfterDispose() {
          return writesAfterDispose;
        },
      };
    };

    it('setter captured before a path change writes to the current property, not the disposed one', () => {
      const oldProperty = createDisposeTrackingProperty('old');
      const newProperty = createDisposeTrackingProperty('new');
      const mockInstance = createMockViewModelInstance({
        'drinks/tea': oldProperty,
        'drinks/coffee': newProperty,
      } as unknown as Record<string, ReturnType<typeof createMockProperty>>);

      const { result, rerender } = renderHook(
        (props: { path: string }) =>
          useRiveProperty<any, string>(
            mockInstance,
            props.path,
            (vmi: any, p) => vmi.stringProperty(p)
          ),
        { initialProps: { path: 'drinks/tea' } }
      );

      const staleSetter = result.current[1];

      // Deps change → useDisposableMemo disposes oldProperty during render
      rerender({ path: 'drinks/coffee' });
      expect(oldProperty.dispose).toHaveBeenCalled();

      act(() => {
        staleSetter('boom');
      });

      // Live-ref semantics (same as useRiveTrigger): the setter targets the
      // hook's current property, never the disposed one.
      expect(oldProperty.writesAfterDispose).toEqual([]);
      expect(newProperty.value).toBe('boom');
    });

    it('setter called after unmount does not write to the disposed property', () => {
      jest.useFakeTimers();
      try {
        const property = createDisposeTrackingProperty('initial');
        const mockInstance = createMockViewModelInstance({
          text: property,
        } as unknown as Record<string, ReturnType<typeof createMockProperty>>);

        const { result, unmount } = renderHook(() =>
          useRiveProperty<any, string>(mockInstance, 'text', (vmi: any, p) =>
            vmi.stringProperty(p)
          )
        );

        const staleSetter = result.current[1];

        unmount();
        // In __DEV__, useDisposableMemo defers unmount disposal via setTimeout(0)
        act(() => {
          jest.runAllTimers();
        });
        expect(property.dispose).toHaveBeenCalled();

        staleSetter('boom');

        expect(property.writesAfterDispose).toEqual([]);
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining("setValue('text') called after dispose")
        );
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
