import { renderHook, act } from '@testing-library/react-native';
import { useRiveProperty } from '../useRiveProperty';
import type { ViewModelInstance } from '../../specs/ViewModel.nitro';

describe('useRiveProperty', () => {
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
      addListener: jest.fn((callback: (value: string) => void) => {
        listener = callback;
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

  it('should return initial value from property on first render', () => {
    const mockProperty = createMockProperty('Tea');
    const mockInstance = createMockViewModelInstance({
      'favDrink/type': mockProperty,
    });

    const { result } = renderHook(() =>
      useRiveProperty<any, string>(mockInstance, 'favDrink/type', {
        getProperty: (vmi, path) => (vmi as any).enumProperty(path),
      })
    );

    const [value] = result.current;
    expect(value).toBe('Tea');
  });

  it('should update value when property changes', () => {
    const mockProperty = createMockProperty('Tea');
    const mockInstance = createMockViewModelInstance({
      'favDrink/type': mockProperty,
    });

    const { result } = renderHook(() =>
      useRiveProperty<any, string>(mockInstance, 'favDrink/type', {
        getProperty: (vmi, path) => (vmi as any).enumProperty(path),
      })
    );

    act(() => {
      mockProperty.value = 'Coffee';
    });

    const [value] = result.current;
    expect(value).toBe('Coffee');
  });

  it('should return undefined when viewModelInstance is null', () => {
    const { result } = renderHook(() =>
      useRiveProperty<any, string>(null, 'favDrink/type', {
        getProperty: (vmi, path) => (vmi as any).enumProperty(path),
      })
    );

    const [value] = result.current;
    expect(value).toBeUndefined();
  });

  it('should return error when property is not found on a valid instance', () => {
    const mockInstance = createMockViewModelInstance({});

    const { result } = renderHook(() =>
      useRiveProperty<any, string>(mockInstance, 'nonexistent/path', {
        getProperty: (vmi, path) => (vmi as any).enumProperty(path),
      })
    );

    const [, , error] = result.current;
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toContain('nonexistent/path');
  });

  it('should not crash when setValue is called on an invalid property', () => {
    const mockInstance = createMockViewModelInstance({});

    const { result } = renderHook(() =>
      useRiveProperty<any, string>(mockInstance, 'nonexistent/path', {
        getProperty: (vmi, path) => (vmi as any).enumProperty(path),
      })
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
        useRiveProperty<any, string>(props.instance, 'text', {
          getProperty: (vmi, path) => (vmi as any).stringProperty(path),
        }),
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
        useRiveProperty<any, string>(props.instance, 'text', {
          getProperty: (vmi, path) => (vmi as any).stringProperty(path),
        }),
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
        useRiveProperty<any, string>(mockInstance, props.path, {
          getProperty: (vmi, p) => (vmi as any).enumProperty(p),
        }),
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
        useRiveProperty<any, string>(props.instance, 'prop/path', {
          getProperty: (vmi, p) => (vmi as any).enumProperty(p),
        }),
      { initialProps: { instance: mockInstance1 } }
    );

    expect(result.current[0]).toBe('Instance1Value');

    rerender({ instance: mockInstance2 });

    expect(result.current[0]).toBe('Instance2Value');
  });
});
