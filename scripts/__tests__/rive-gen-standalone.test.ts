import { test } from 'node:test';
import { expect } from 'expect';
import { spawnSync } from 'child_process';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import ts from 'typescript';

const ROOT = resolve(import.meta.dirname, '../..');

test('standalone schemas (--out) keep names checked', () => {
  const dir = mkdtempSync(join(tmpdir(), 'riv-standalone-'));
  const gen = spawnSync(
    process.execPath,
    [
      join(ROOT, 'scripts/rive-gen-types.ts'),
      join(ROOT, 'example/assets/rive/rewards.riv'),
      '--out',
      join(dir, 'RewardsSchema.ts'),
      '--name',
      'RewardsSchema',
    ],
    { encoding: 'utf8', timeout: 30_000 }
  );
  expect(gen.status).toBe(0);

  // Every misuse must error: an unused @ts-expect-error fails compilation.
  writeFileSync(
    join(dir, 'probe.ts'),
    `import type { EnumValues, TypedViewModelInstance } from '@rive-app/react-native';
import type { RewardsSchema } from './RewardsSchema';
declare const vm: TypedViewModelInstance<RewardsSchema, 'Rewards'>;
vm.numberProperty('Price_Value');
// @ts-expect-error unknown property
vm.numberProperty('DoesNotExist');
export const item: EnumValues<RewardsSchema, 'Item_Selection'> = 'Coin';
// @ts-expect-error unknown enum
export type Unknown = EnumValues<RewardsSchema, 'NotAnEnum'>;
`
  );
  const program = ts.createProgram([join(dir, 'probe.ts')], {
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ESNext,
    allowArbitraryExtensions: true,
    paths: { '@rive-app/react-native': [join(ROOT, 'src/index')] },
  });
  const errors = ts
    .getPreEmitDiagnostics(program)
    .filter((d) => d.file?.fileName.startsWith(dir))
    .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
  expect(errors).toEqual([]);
});
