import { renderHook } from '@testing-library/react-native';
import { useRiveNumber } from '../useRiveNumber';
import { useRiveString } from '../useRiveString';
import { useRiveBoolean } from '../useRiveBoolean';
import { useRiveEnum } from '../useRiveEnum';
import { useRiveColor } from '../useRiveColor';
import type { ViewModelInstance } from '../../specs/ViewModel.nitro';

function createMockProperty(set: jest.Mock) {
  return {
    set,
    getValueAsync: jest.fn(() => new Promise(() => {})),
    addListener: jest.fn(() => () => {}),
    dispose: jest.fn(),
  };
}

function createMockInstance(property: ReturnType<typeof createMockProperty>) {
  const get = jest.fn(() => property);
  return {
    numberProperty: get,
    stringProperty: get,
    booleanProperty: get,
    enumProperty: get,
    colorProperty: get,
  } as unknown as ViewModelInstance;
}

type Setter = { setValue: (value: any) => Promise<void> };

describe('useRive* setters return the native set() promise', () => {
  const cases: [
    string,
    (vmi: ViewModelInstance) => Setter,
    unknown,
    unknown,
  ][] = [
    ['useRiveNumber', (vmi) => useRiveNumber('p', vmi), 1, 1],
    ['useRiveString', (vmi) => useRiveString('p', vmi), 'a', 'a'],
    ['useRiveBoolean', (vmi) => useRiveBoolean('p', vmi), true, true],
    ['useRiveEnum', (vmi) => useRiveEnum('p', vmi), 'cat', 'cat'],
    ['useRiveColor', (vmi) => useRiveColor('p', vmi), '#ff0000', -0x10000],
  ];

  it.each(cases)(
    '%s resolves with the write',
    async (_, hook, input, expected) => {
      const set = jest.fn(() => Promise.resolve());
      const vmi = createMockInstance(createMockProperty(set));
      const { result } = renderHook(() => hook(vmi));

      await expect(result.current.setValue(input)).resolves.toBeUndefined();
      expect(set).toHaveBeenCalledWith(expected);
    }
  );

  it.each(cases)('%s rejects when the write fails', async (_, hook, input) => {
    const set = jest.fn(() => Promise.reject(new Error('write failed')));
    const vmi = createMockInstance(createMockProperty(set));
    const { result } = renderHook(() => hook(vmi));

    await expect(result.current.setValue(input)).rejects.toThrow(
      'write failed'
    );
  });
});
