import { describe, test, before } from 'node:test';
import { expect } from 'expect';
import { spawnSync } from 'child_process';
import { resolve } from 'path';

// Built from fixtures/riv-schema/scene.rml with the Rive CLI; see
// fixtures/riv-schema/rive.yaml for how to rebuild it.
const EXTRACTOR = resolve(import.meta.dirname, '../rive-extract-schema.ts');
const FIXTURE_RIV = resolve(
  import.meta.dirname,
  'fixtures/riv-schema/riv-schema.riv'
);

describe('rive-extract-schema on the RML fixture', () => {
  let schema: Record<string, unknown>;

  before(() => {
    const result = spawnSync(process.execPath, [EXTRACTOR, FIXTURE_RIV], {
      encoding: 'utf8',
      timeout: 30_000,
      cwd: resolve(import.meta.dirname, '../..'),
    });
    if (result.status !== 0) {
      throw new Error(result.stderr ?? 'extractor failed');
    }
    schema = JSON.parse(result.stdout);
  });

  test('extracts the whole authored schema, hostile names included', () => {
    expect(schema).toEqual({
      artboards: ['Main', "O'Brien's Board"],
      defaultArtboard: 'Main',
      stateMachines: {
        'Main': ['State Machine 1', 'Hover|Press'],
        "O'Brien's Board": ["It's SM"],
      },
      enums: {
        Status: ['idle', 'running', 'failed'],
        Weird: ['a|b', "it's"],
      },
      viewModels: {
        Card: {
          title: 'string',
          count: 'number',
          done: 'boolean',
          tint: 'color',
          tap: 'trigger',
          status: 'enum:Status',
        },
        Screen: {
          'card': 'viewModel:Card',
          'mode': 'enum:Status',
          'weird': 'enum:Weird',
          'page title': 'string',
          // A built-in enum: the runtime reports no enum name for it.
          'blend': 'enum',
        },
      },
      // Keys are the runtime's uniqueNames. The embedded image is omitted, and
      // the hosted image counts toward the numbering though it has no sidecar.
      referencedAssets: {
        'ref_image-1': 'image',
        'hosted_image-2': 'image',
        'beep-3': 'audio',
      },
    });
  });
});
