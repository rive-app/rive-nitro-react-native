import { describe, test } from 'node:test';
import { expect } from 'expect';
import { spawnSync } from 'child_process';
import { resolve } from 'path';
import { readdirSync, existsSync } from 'fs';

const GENERATOR = resolve(import.meta.dirname, '../rive-gen-types.ts');
const ASSETS_DIR = resolve(import.meta.dirname, '../../example/assets/rive');

describe('rive-gen-types --all', () => {
  // Regression: an asset whose WASM load() stalls used to drain bun's event
  // loop mid-batch — the process exited 0 after writing only a prefix of the
  // schemas, so CI silently validated a subset (many_viewmodels.riv was the
  // in-tree trigger). Every .riv must produce exactly one Written line.
  test(
    'writes a schema for every .riv file (no silent truncation)',
    { timeout: 300_000 },
    () => {
      const result = spawnSync(
        process.execPath,
        [GENERATOR, '--all', ASSETS_DIR],
        {
          encoding: 'utf8',
          timeout: 300_000,
          cwd: resolve(import.meta.dirname, '../..'),
        }
      );
      expect(result.status).toBe(0);

      const rivFiles = readdirSync(ASSETS_DIR).filter((f) =>
        f.endsWith('.riv')
      );
      const written = (result.stdout ?? '')
        .split('\n')
        .filter((l) => l.startsWith('Written: '));
      expect(written.length).toBe(rivFiles.length);
      for (const riv of rivFiles) {
        expect(existsSync(resolve(ASSETS_DIR, `${riv}.d.ts`))).toBe(true);
      }
    }
  );
});
