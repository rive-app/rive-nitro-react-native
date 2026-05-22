import { renderHook, act } from '@testing-library/react-native';
import { useRiveTrigger } from '../useRiveTrigger';
import type { ViewModelInstance } from '../../specs/ViewModel.nitro';

function createMockTriggerProperty() {
  let listener: (() => void) | null = null;
  return {
    trigger: jest.fn(),
    addListener: jest.fn((callback: () => void) => {
      listener = callback;
      return () => {
        listener = null;
      };
    }),
    dispose: jest.fn(),
    fireListener() {
      listener?.();
    },
  };
}

function createMockViewModelInstance(
  propertyMap: Record<string, ReturnType<typeof createMockTriggerProperty>>
) {
  return {
    triggerProperty: jest.fn((path: string) => propertyMap[path]),
  } as unknown as ViewModelInstance;
}

describe('useRiveTrigger', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    try {
      jest.runAllTimers();
    } catch {
      // Some tests intentionally dispose
    }
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('calls trigger on the native property', () => {
    const mockProperty = createMockTriggerProperty();
    const mockInstance = createMockViewModelInstance({
      'Button/Pressed': mockProperty,
    });

    const { result } = renderHook(() =>
      useRiveTrigger('Button/Pressed', mockInstance)
    );

    act(() => {
      result.current.trigger();
    });

    expect(mockProperty.trigger).toHaveBeenCalledTimes(1);
  });

  it('warns when trigger is called before property is available', () => {
    const { result } = renderHook(() =>
      useRiveTrigger('Button/Pressed', undefined)
    );

    act(() => {
      result.current.trigger();
    });

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('not available yet')
    );
  });

  it('warns when trigger is called after unmount', () => {
    const mockProperty = createMockTriggerProperty();
    const mockInstance = createMockViewModelInstance({
      'Button/Pressed': mockProperty,
    });

    const { result, unmount } = renderHook(() =>
      useRiveTrigger('Button/Pressed', mockInstance)
    );

    const { trigger } = result.current;

    unmount();
    act(() => {
      jest.runAllTimers();
    });

    trigger();

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('called after dispose')
    );
    expect(mockProperty.trigger).not.toHaveBeenCalled();
  });

  it('invokes onTrigger callback when native trigger fires', () => {
    const mockProperty = createMockTriggerProperty();
    const mockInstance = createMockViewModelInstance({
      'Button/Pressed': mockProperty,
    });
    const onTrigger = jest.fn();

    renderHook(() =>
      useRiveTrigger('Button/Pressed', mockInstance, { onTrigger })
    );

    act(() => {
      mockProperty.fireListener();
    });

    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('returns error when property path is invalid', () => {
    const mockInstance = createMockViewModelInstance({});

    const { result } = renderHook(() =>
      useRiveTrigger('nonexistent/path', mockInstance)
    );

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain('nonexistent/path');
  });
});
