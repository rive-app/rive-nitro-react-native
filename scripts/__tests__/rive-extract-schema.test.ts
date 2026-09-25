import { describe, test, before } from 'node:test';
import { expect } from 'expect';
import { spawnSync } from 'child_process';
import { resolve } from 'path';

const EXTRACTOR = resolve(import.meta.dirname, '../rive-extract-schema.ts');
const REWARDS_RIV = resolve(
  import.meta.dirname,
  '../../example/assets/rive/rewards.riv'
);

function extract(path: string) {
  const result = spawnSync(process.execPath, [EXTRACTOR, path], {
    encoding: 'utf8',
    timeout: 30_000,
    cwd: resolve(import.meta.dirname, '../..'),
  });
  if (result.status !== 0) throw new Error(result.stderr ?? 'extractor failed');
  return JSON.parse(result.stdout) as Record<string, unknown>;
}

describe('rive-extract-schema', () => {
  let schema: ReturnType<typeof extract>;

  before(() => {
    schema = extract(REWARDS_RIV);
  });

  test('extracts artboards', () => {
    expect(schema.artboards).toContain('Main');
    expect(schema.defaultArtboard).toBe('Main');
  });

  test('extracts state machines per artboard', () => {
    expect((schema.stateMachines as Record<string, string[]>).Main).toContain(
      'State Machine 1'
    );
  });

  test('extracts viewModels', () => {
    expect(
      (schema.viewModels as Record<string, unknown>).Rewards
    ).toBeDefined();
  });

  test('resolves nested viewModel references', () => {
    const vms = schema.viewModels as Record<string, Record<string, string>>;
    expect(vms.Rewards!.Coin).toBe('viewModel:Item_Icon_Value');
  });

  test('extracts primitive property types', () => {
    const vms = schema.viewModels as Record<string, Record<string, string>>;
    expect(vms.Item_Icon_Value!.Item_Value).toBe('number');
    expect(vms.Energy_Bar!.Bar_Color).toBe('color');
  });

  test('extracts non-embedded assets by uniqueName and kind', () => {
    const oob = extract(
      resolve(import.meta.dirname, '../../example/assets/rive/out_of_band.riv')
    );
    expect(oob.referencedAssets).toEqual({
      'Inter-594377': 'font',
      'referenced-image-2929282': 'image',
      'referenced_audio-2929340': 'audio',
      'hosted_audio-2989208': 'audio',
      'Damion-593587': 'font',
      'cdn-image-2989123': 'image',
    });
  });

  test('embedded-only files report no referenced assets', () => {
    expect(schema.referencedAssets).toEqual({});
  });

  test('enum properties reference a file-level enum definition', () => {
    const databinding = extract(
      resolve(import.meta.dirname, '../../example/assets/rive/databinding.riv')
    );
    const vms = databinding.viewModels as Record<
      string,
      Record<string, string>
    >;
    const enums = databinding.enums as Record<string, string[]>;
    // Person.favourite_pet and Pet.type share the same enum — declared once.
    expect(vms.Person!.favourite_pet).toBe('enum:Pets');
    expect(vms.Pet!.type).toBe('enum:Pets');
    expect(enums.Pets).toEqual([
      'chipmunk',
      'rat',
      'frog',
      'owl',
      'cat',
      'dog',
    ]);
  });
});
