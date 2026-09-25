/**
 * Prints the schema of a .riv file as JSON: artboards, state machines, enums,
 * view models and referenced assets — the same data rive-gen-types emits as
 * a .riv.d.ts.
 *
 * Usage:
 *   node scripts/rive-extract-schema.ts path/to/file.riv
 *   node scripts/rive-extract-schema.ts https://example.com/file.riv
 */

import { extractSchema, setupWasmShims } from './rive-gen-types.ts';

const input: string | undefined = process.argv[2];

if (!input) {
  process.stderr.write('Usage: node rive-extract-schema.ts <path-or-url>\n');
  process.exit(1);
}

// Also routes the WASM runtime's console output to stderr, keeping stdout
// pure JSON.
setupWasmShims();

extractSchema(input)
  .then((schema) => {
    process.stdout.write(JSON.stringify(schema, null, 2) + '\n');
  })
  .catch((err: Error) => {
    process.stderr.write(err.message + '\n');
    process.exit(1);
  });
