import { describe, test, before } from 'node:test';
import { expect } from 'expect';
import { spawnSync } from 'child_process';
import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

const GENERATOR = resolve(import.meta.dirname, '../rive-gen-types.ts');
const REWARDS_RIV = resolve(
  import.meta.dirname,
  '../../example/assets/rive/rewards.riv'
);
const OUT_DTS = `${REWARDS_RIV}.d.ts`;

describe('rive-gen-types', () => {
  before(() => {
    const result = spawnSync(process.execPath, [GENERATOR, REWARDS_RIV], {
      encoding: 'utf8',
      timeout: 30_000,
      cwd: resolve(import.meta.dirname, '../..'),
    });
    if (result.status !== 0)
      throw new Error(result.stderr ?? 'generator failed');
  });

  test('generates .riv.d.ts next to source file', () => {
    expect(existsSync(OUT_DTS)).toBe(true);
  });

  test('generated file declares a RiveAsset default export', () => {
    const content = readFileSync(OUT_DTS, 'utf8');
    expect(content).toContain('declare const asset: RiveAsset<');
    expect(content).toContain('export default asset');
  });

  test('generated file contains artboard types', () => {
    const content = readFileSync(OUT_DTS, 'utf8');
    expect(content).toContain("'Main'");
  });

  test('generated file contains viewModel types', () => {
    const content = readFileSync(OUT_DTS, 'utf8');
    expect(content).toContain('Rewards: {');
    expect(content).toContain("'viewModel:Item_Icon_Value'");
  });

  test('generated file has eslint-disable header', () => {
    const content = readFileSync(OUT_DTS, 'utf8');
    expect(content).toContain('eslint-disable');
  });
});
