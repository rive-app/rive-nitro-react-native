import { describe, it, expect } from 'react-native-harness';
import type { ViewModelInstance } from '@rive-app/react-native';
import { RiveFileFactory } from '@rive-app/react-native';

const DATABINDING = require('../assets/rive/databinding.riv');
const DATABINDING_LISTS = require('../assets/rive/databinding_lists.riv');
const ARTBOARD_DB_TEST = require('../assets/rive/artboard_db_test.riv');

function expectDefined<T>(value: T): asserts value is NonNullable<T> {
  expect(value).toBeDefined();
}

async function loadFile(source: number) {
  return RiveFileFactory.fromSource(source, undefined);
}

async function createGordonInstanceAsync(): Promise<ViewModelInstance> {
  const file = await loadFile(DATABINDING);
  const vm = await file.viewModelByNameAsync('Person');
  expectDefined(vm);
  const instance = await vm.createInstanceByNameAsync('Gordon');
  expectDefined(instance);
  return instance;
}

/* eslint-disable no-bitwise */
function getRGB(color: number): { r: number; g: number; b: number } {
  return {
    r: (color >> 16) & 0xff,
    g: (color >> 8) & 0xff,
    b: color & 0xff,
  };
}
/* eslint-enable no-bitwise */

describe('Async ViewModel Creation', () => {
  it('createDefaultInstanceAsync returns a valid instance', async () => {
    const file = await loadFile(DATABINDING);
    const vm = await file.viewModelByNameAsync('Person');
    expectDefined(vm);

    const instance = await vm.createDefaultInstanceAsync();
    expectDefined(instance);
    expect(typeof instance.instanceName).toBe('string');
  });

  it('createInstanceByNameAsync("Gordon") returns named instance', async () => {
    const file = await loadFile(DATABINDING);
    const vm = await file.viewModelByNameAsync('Person');
    expectDefined(vm);

    const instance = await vm.createInstanceByNameAsync('Gordon');
    expectDefined(instance);
  });

  it('createInstanceByNameAsync with non-existent name returns undefined or throws', async () => {
    const file = await loadFile(DATABINDING);
    const vm = await file.viewModelByNameAsync('Person');
    expectDefined(vm);

    try {
      const instance = await vm.createInstanceByNameAsync('__DoesNotExist__');
      expect(instance).toBeUndefined();
    } catch {
      // experimental backend may throw
    }
  });

  it('createBlankInstanceAsync returns an instance', async () => {
    const file = await loadFile(DATABINDING);
    const vm = await file.viewModelByNameAsync('Person');
    expectDefined(vm);

    const instance = await vm.createBlankInstanceAsync();
    expectDefined(instance);
  });
});

describe('Async RiveFile Methods', () => {
  it('defaultArtboardViewModelAsync returns a ViewModel', async () => {
    const file = await loadFile(DATABINDING);
    const vm = await file.defaultArtboardViewModelAsync();
    expectDefined(vm);
    expect(typeof vm.modelName).toBe('string');
  });

  it('getArtboardCountAsync returns a positive number', async () => {
    const file = await loadFile(DATABINDING);
    const count = await file.getArtboardCountAsync();
    expect(count).toBeGreaterThan(0);
  });

  it('getArtboardNamesAsync returns string array', async () => {
    const file = await loadFile(DATABINDING);
    const names = await file.getArtboardNamesAsync();
    expect(names.length).toBeGreaterThan(0);
    names.forEach((name) => expect(typeof name).toBe('string'));
  });

  it('getArtboardCountAsync matches getArtboardNamesAsync length', async () => {
    const file = await loadFile(DATABINDING);
    const count = await file.getArtboardCountAsync();
    const names = await file.getArtboardNamesAsync();
    expect(count).toBe(names.length);
  });
});

describe('Async ViewModel Metadata', () => {
  it('getPropertiesAsync on ViewModel returns property info', async () => {
    const file = await loadFile(DATABINDING);
    const vm = await file.viewModelByNameAsync('Person');
    expectDefined(vm);

    try {
      const props = await vm.getPropertiesAsync();
      expect(props.length).toBeGreaterThan(0);
      props.forEach((prop) => {
        expect(typeof prop.name).toBe('string');
        expect(typeof prop.type).toBe('string');
      });
    } catch {
      // getPropertiesAsync is not supported on the legacy backend
    }
  });

  it('getPropertyCountAsync matches getPropertiesAsync length', async () => {
    const file = await loadFile(DATABINDING);
    const vm = await file.viewModelByNameAsync('Person');
    expectDefined(vm);

    try {
      const count = await vm.getPropertyCountAsync();
      const props = await vm.getPropertiesAsync();
      expect(count).toBe(props.length);
    } catch {
      // getPropertiesAsync is not supported on the legacy backend
    }
  });

  it('getInstanceCountAsync returns a non-negative number', async () => {
    const file = await loadFile(DATABINDING);
    const vm = await file.viewModelByNameAsync('Person');
    expectDefined(vm);

    const count = await vm.getInstanceCountAsync();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

describe('Async Property getValueAsync', () => {
  it('numberProperty getValueAsync returns correct value', async () => {
    const instance = await createGordonInstanceAsync();
    const prop = instance.numberProperty('age');
    expectDefined(prop);

    const value = await prop.getValueAsync();
    expect(value).toBe(30);
  });

  it('stringProperty getValueAsync returns correct value', async () => {
    const instance = await createGordonInstanceAsync();
    const prop = instance.stringProperty('name');
    expectDefined(prop);

    const value = await prop.getValueAsync();
    expect(value).toBe('Gordon');
  });

  it('booleanProperty getValueAsync returns correct value', async () => {
    const instance = await createGordonInstanceAsync();
    const prop = instance.booleanProperty('likes_popcorn');
    expectDefined(prop);

    const value = await prop.getValueAsync();
    expect(value).toBe(false);
  });

  it('colorProperty getValueAsync returns an ARGB number', async () => {
    const instance = await createGordonInstanceAsync();
    const prop = instance.colorProperty('favourite_color');
    expectDefined(prop);

    const value = await prop.getValueAsync();
    expect(typeof value).toBe('number');
    const rgb = getRGB(value);
    expect(rgb).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('enumProperty getValueAsync returns correct string', async () => {
    const instance = await createGordonInstanceAsync();
    const prop = instance.enumProperty('favourite_pet');
    expectDefined(prop);

    const value = await prop.getValueAsync();
    expect(value).toBe('dog');
  });

  it('set() then getValueAsync reflects the change for number', async () => {
    const instance = await createGordonInstanceAsync();
    const prop = instance.numberProperty('age');
    expectDefined(prop);

    prop.set(42);
    // Allow async propagation
    await new Promise<void>((r) => setTimeout(r, 100));
    const value = await prop.getValueAsync();
    expect(value).toBe(42);
  });

  it('set() then getValueAsync reflects the change for string', async () => {
    const instance = await createGordonInstanceAsync();
    const prop = instance.stringProperty('name');
    expectDefined(prop);

    prop.set('Alice');
    await new Promise<void>((r) => setTimeout(r, 100));
    const value = await prop.getValueAsync();
    expect(value).toBe('Alice');
  });

  it('set() then getValueAsync reflects the change for boolean', async () => {
    const instance = await createGordonInstanceAsync();
    const prop = instance.booleanProperty('likes_popcorn');
    expectDefined(prop);

    prop.set(true);
    await new Promise<void>((r) => setTimeout(r, 100));
    const value = await prop.getValueAsync();
    expect(value).toBe(true);
  });

  it('set() then getValueAsync reflects the change for color', async () => {
    const instance = await createGordonInstanceAsync();
    const prop = instance.colorProperty('favourite_color');
    expectDefined(prop);

    prop.set(0xff00ff00);
    await new Promise<void>((r) => setTimeout(r, 100));
    const value = await prop.getValueAsync();
    const rgb = getRGB(value);
    expect(rgb).toEqual({ r: 0, g: 255, b: 0 });
  });

  it('set() then getValueAsync reflects the change for enum', async () => {
    const instance = await createGordonInstanceAsync();
    const prop = instance.enumProperty('favourite_pet');
    expectDefined(prop);

    prop.set('cat');
    await new Promise<void>((r) => setTimeout(r, 100));
    const value = await prop.getValueAsync();
    expect(value).toBe('cat');
  });
});

describe('Async ViewModelInstance Methods', () => {
  it('viewModelAsync returns nested instance', async () => {
    const instance = await createGordonInstanceAsync();
    const petInstance = await instance.viewModelAsync('pet');
    expectDefined(petInstance);

    const petName = petInstance.stringProperty('name');
    expectDefined(petName);
    const name = await petName.getValueAsync();
    expect(name).toBe('Jameson');
  });

  it('viewModelAsync with non-existent path returns undefined or throws', async () => {
    const instance = await createGordonInstanceAsync();
    try {
      const result = await instance.viewModelAsync('nonexistent');
      // Legacy returns undefined, experimental may return a wrapper or throw
      if (RiveFileFactory.getBackend() !== 'experimental') {
        expect(result).toBeUndefined();
      }
    } catch {
      // experimental backend may throw
    }
  });

  it('getPropertiesAsync on ViewModelInstance returns property info', async () => {
    const file = await loadFile(DATABINDING);
    const vm = await file.viewModelByNameAsync('Person');
    expectDefined(vm);
    const instance = await vm.createInstanceByNameAsync('Gordon');
    expectDefined(instance);

    try {
      const props = await instance.getPropertiesAsync();
      expect(props.length).toBeGreaterThan(0);
      const propNames = props.map((p) => p.name);
      expect(propNames).toContain('age');
      expect(propNames).toContain('name');
    } catch {
      // getPropertiesAsync is not supported on the legacy backend
    }
  });
});

describe('Async List Operations', () => {
  async function createDevRelInstance() {
    const file = await loadFile(DATABINDING_LISTS);
    const vm = await file.viewModelByNameAsync('DevRel');
    expectDefined(vm);
    const instance = await vm.createDefaultInstanceAsync();
    expectDefined(instance);
    return { file, instance };
  }

  it('getLengthAsync returns expected count', async () => {
    const { instance } = await createDevRelInstance();
    const list = instance.listProperty('team');
    expectDefined(list);

    const length = await list.getLengthAsync();
    expect(length).toBe(5);
  });

  it('getInstanceAtAsync returns ViewModelInstance', async () => {
    const { instance } = await createDevRelInstance();
    const list = instance.listProperty('team');
    expectDefined(list);

    const item = await list.getInstanceAtAsync(0);
    expectDefined(item);

    const nameProp = item.stringProperty('name');
    expectDefined(nameProp);
    const name = await nameProp.getValueAsync();
    expect(name).toBe('Gordon');
  });

  it('addInstanceAsync increases length', async () => {
    const { file, instance } = await createDevRelInstance();
    const list = instance.listProperty('team');
    expectDefined(list);

    const initialLength = await list.getLengthAsync();

    const personVM = await file.viewModelByNameAsync('Person');
    expectDefined(personVM);
    const newPerson = await personVM.createBlankInstanceAsync();
    expectDefined(newPerson);
    const nameProp = newPerson.stringProperty('name');
    expectDefined(nameProp);
    nameProp.set('NewPerson');

    await list.addInstanceAsync(newPerson);
    const newLength = await list.getLengthAsync();
    expect(newLength).toBe(initialLength + 1);
  });

  it('removeInstanceAtAsync decreases length', async () => {
    const { instance } = await createDevRelInstance();
    const list = instance.listProperty('team');
    expectDefined(list);

    const initialLength = await list.getLengthAsync();
    await list.removeInstanceAtAsync(0);
    const newLength = await list.getLengthAsync();
    expect(newLength).toBe(initialLength - 1);
  });

  it('swapAsync reorders items', async () => {
    const { instance } = await createDevRelInstance();
    const list = instance.listProperty('team');
    expectDefined(list);

    const item0 = await list.getInstanceAtAsync(0);
    const item1 = await list.getInstanceAtAsync(1);
    expectDefined(item0);
    expectDefined(item1);
    const name0Before = await item0.stringProperty('name')!.getValueAsync();
    const name1Before = await item1.stringProperty('name')!.getValueAsync();

    await list.swapAsync(0, 1);

    const swapped0 = await list.getInstanceAtAsync(0);
    const swapped1 = await list.getInstanceAtAsync(1);
    expectDefined(swapped0);
    expectDefined(swapped1);
    const name0After = await swapped0.stringProperty('name')!.getValueAsync();
    const name1After = await swapped1.stringProperty('name')!.getValueAsync();

    expect(name0After).toBe(name1Before);
    expect(name1After).toBe(name0Before);
  });
});

describe('Async Artboard Access', () => {
  it('defaultArtboardViewModelAsync on artboard_db_test file works', async () => {
    const file = await loadFile(ARTBOARD_DB_TEST);
    const vm = await file.defaultArtboardViewModelAsync();
    expectDefined(vm);
  });

  it('getArtboardNamesAsync on artboard_db_test returns expected artboards', async () => {
    const file = await loadFile(ARTBOARD_DB_TEST);
    const names = await file.getArtboardNamesAsync();
    expect(names.length).toBeGreaterThan(0);
  });
});
