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

  it('should return error when property is not found', () => {
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
