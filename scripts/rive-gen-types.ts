#!/usr/bin/env bun
/**
 * Generates .riv.d.ts declaration files so that `import asset from './file.riv'`
 * is automatically typed in TypeScript without any extra imports.
 *
 * Usage:
 *   bun scripts/rive-gen-types.ts <path-or-url>          # writes <file>.riv.d.ts next to the source
 *   bun scripts/rive-gen-types.ts <path> --out <out.ts>  # write a standalone schema .ts instead
 *   bun scripts/rive-gen-types.ts --all <directory>      # generate for every .riv in a directory
 *
 * After generation, TypeScript resolves the .riv.d.ts automatically:
 *   import gameRiv from './assets/game.riv';              // typed as RiveAsset<GameSchema>
 *   const file = await RiveFileFactory.fromSource(gameRiv); // TypedRiveFile<GameSchema> — T inferred
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  statSync,
} from 'fs';
import { dirname, resolve, basename, extname } from 'path';
import { RuntimeLoader } from '@rive-app/canvas';

// Browser shims required by the @rive-app/canvas WASM runtime.
(globalThis as any).document = {
  createElement: () => ({ getContext: () => null }),
};
(globalThis as any).Image = class {};

// Silence WASM warnings (e.g. "No WebGL support") so they don't pollute output.
console.log = (...args: unknown[]) =>
  process.stderr.write(args.join(' ') + '\n');
console.warn = (...args: unknown[]) =>
  process.stderr.write(args.join(' ') + '\n');

interface Schema {
  artboards: string[];
  defaultArtboard: string;
  stateMachines: Record<string, string[]>;
  viewModels: Record<string, Record<string, string>>;
}

let runtimeReady: Promise<any> | null = null;

async function getRuntime(): Promise<any> {
  if (!runtimeReady) {
    runtimeReady = RuntimeLoader.awaitInstance().then((runtime) => {
      // On headless Linux (no WebGL) the image-load counter (aa.total/aa.loaded)
      // never resolves. Wrap img.decode to fire img.la() via queueMicrotask after
      // K() returns so the Promise resolves with the actual file, not null.
      const origMRI = (runtime.renderFactory as any).makeRenderImage.bind(
        runtime.renderFactory
      );
      (runtime.renderFactory as any).makeRenderImage = function () {
        const img = origMRI();
        if (
          img &&
          typeof (img as any).la === 'function' &&
          typeof (img as any).decode === 'function'
        ) {
          const origDecode = (img as any).decode.bind(img);
          (img as any).decode = function (imgBytes: Uint8Array) {
            origDecode(imgBytes);
            queueMicrotask(() => (img as any).la());
          };
        }
        return img;
      };
      return runtime;
    });
  }
  return runtimeReady;
}

async function extractSchema(input: string): Promise<Schema> {
  const bytes =
    input.startsWith('http://') || input.startsWith('https://')
      ? new Uint8Array(await (await fetch(input)).arrayBuffer())
      : new Uint8Array(readFileSync(input));

  const runtime = await getRuntime();

  const assetLoader = new (runtime as any).CustomFileAssetLoader({
    loadContents: (asset: any, embeddedBytes: Uint8Array) => {
      if (embeddedBytes?.length && asset?.decode) {
        asset.decode(embeddedBytes);
      }
      return true;
    },
  });

  const riveFile = await runtime.load(bytes, assetLoader, false);

  const artboards: string[] = [];
  const stateMachines: Record<string, string[]> = {};
  for (let i = 0; i < riveFile.artboardCount(); i++) {
    const artboard = riveFile.artboardByIndex(i);
    artboards.push(artboard.name);
    const sms: string[] = [];
    for (let j = 0; j < artboard.stateMachineCount(); j++) {
      sms.push(artboard.stateMachineByIndex(j).name);
    }
    stateMachines[artboard.name] = sms;
  }

  const viewModels: Record<string, Record<string, string>> = {};
  const vmCount = (riveFile as any).viewModelCount() as number;
  for (let i = 0; i < vmCount; i++) {
    const vm = (riveFile as any).viewModelByIndex(i);
    const properties = vm.getProperties() as Array<{
      name: string;
      type: string;
    }>;
    const inst = vm.instance?.() as any;
    const props: Record<string, string> = {};
    for (const p of properties) {
      if (p.type === 'viewModel' && inst) {
        try {
          const nested = inst.viewModel?.(p.name);
          const refName = nested?.getViewModelName?.();
          props[p.name] = refName ? `viewModel:${refName}` : 'viewModel';
        } catch {
          props[p.name] = 'viewModel';
        }
      } else if (p.type === 'enumType' && inst) {
        try {
          const ep = inst.enum?.(p.name);
          const values: string[] = ep?.values ?? [];
          props[p.name] =
            values.length > 0 ? `enum:${values.join('|')}` : 'enum';
        } catch {
          props[p.name] = 'enum';
        }
      } else {
        props[p.name] = p.type;
      }
    }
    viewModels[vm.name] = props;
  }

  return {
    artboards,
    defaultArtboard: artboards[0] ?? '',
    stateMachines,
    viewModels,
  };
}

// With prettier quoteProps:"consistent", if any key in an object needs quotes, all get quotes.
const IDENTIFIER_RE = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
const needsQuote = (s: string) => !IDENTIFIER_RE.test(s);
const quoteKey = (s: string, forceQuote: boolean) =>
  forceQuote || needsQuote(s) ? `'${s}'` : s;

function smRecord(stateMachines: Record<string, string[]>): string {
  const keys = Object.keys(stateMachines);
  const force = keys.some(needsQuote);
  return Object.entries(stateMachines)
    .map(([ab, sms]) => {
      const union = sms.length ? sms.map((s) => `'${s}'`).join(' | ') : 'never';
      return `    ${quoteKey(ab, force)}: ${union};`;
    })
    .join('\n');
}

function vmRecord(viewModels: Record<string, Record<string, string>>): string {
  const vmKeys = Object.keys(viewModels);
  const forceVmKeys = vmKeys.some(needsQuote);
  return Object.entries(viewModels)
    .map(([vmName, props]) => {
      const propKeys = Object.keys(props);
      const forcePropKeys = propKeys.some(needsQuote);
      const propLines = Object.entries(props)
        .map(
          ([propName, propType]) =>
            `      ${quoteKey(propName, forcePropKeys)}: '${propType}';`
        )
        .join('\n');
      return `    ${quoteKey(vmName, forceVmKeys)}: {\n${propLines}\n    };`;
    })
    .join('\n');
}

function schemaBody(schema: Schema): string {
  const vmSection =
    Object.keys(schema.viewModels).length > 0
      ? `\n  viewModels: {\n${vmRecord(schema.viewModels)}\n  };`
      : '';
  return `\
  artboards: ${schema.artboards.map((a) => `'${a}'`).join(' | ')};
  defaultArtboard: '${schema.defaultArtboard}';
  stateMachines: {
${smRecord(schema.stateMachines)}
  };${vmSection}`;
}

function dtsContent(input: string, schema: Schema): string {
  return `\
// Generated by rive-gen-types — do not edit manually. @generated
// eslint-disable
// Source: ${basename(input)}
import type { RiveAsset } from '@rive-app/react-native';
declare const asset: RiveAsset<{
${schemaBody(schema)}
}>;
export default asset;
`;
}

function standaloneContent(
  input: string,
  typeName: string,
  schema: Schema
): string {
  return `\
// Generated by rive-gen-types — do not edit manually.
// Source: ${input}
import type { RiveFileSchema } from '@rive-app/react-native';

export type ${typeName} = RiveFileSchema & {
${schemaBody(schema)}
};
`;
}

async function generate(
  input: string,
  outPath: string,
  mode: 'dts' | 'standalone',
  typeName?: string
) {
  let schema: Schema;
  try {
    schema = await extractSchema(input);
  } catch (err) {
    process.stderr.write(
      `Failed to extract schema from ${input}: ${err instanceof Error ? err.message : String(err)}\n`
    );
    process.exit(1);
  }

  if (!schema.artboards?.length) {
    process.stderr.write(`No artboards found in ${input}.\n`);
    process.exit(1);
  }

  const content =
    mode === 'dts'
      ? dtsContent(input, schema)
      : standaloneContent(input, typeName!, schema);

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, content, 'utf8');
  process.stdout.write(`Written: ${outPath}\n`);
}

function findRivFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findRivFiles(full));
    } else if (extname(entry) === '.riv') {
      results.push(full);
    }
  }
  return results;
}

// --- CLI ---

async function main() {
  // noUncheckedIndexedAccess: slice gives string[], index access gives string | undefined
  const args: string[] = process.argv.slice(2);

  if (args[0] === '--all') {
    const dir: string | undefined = args[1];
    if (!dir) {
      process.stderr.write('Usage: rive-gen-types --all <directory>\n');
      process.exit(1);
    }
    const files = findRivFiles(resolve(process.cwd(), dir));
    if (!files.length) {
      process.stderr.write(`No .riv files found in ${dir}\n`);
      process.exit(1);
    }
    for (const file of files) {
      await generate(file, `${file}.d.ts`, 'dts');
    }
    return;
  }

  if (!args.length || args[0]!.startsWith('--')) {
    process.stderr.write(
      'Usage:\n' +
        '  rive-gen-types <path-or-url>               # writes <file>.riv.d.ts\n' +
        '  rive-gen-types <path> --out <out.ts>        # standalone schema .ts\n' +
        '  rive-gen-types --all <directory>            # all .riv files in dir\n'
    );
    process.exit(1);
  }

  const input = args[0]!;
  const outIdx = args.indexOf('--out');

  if (outIdx !== -1) {
    // Standalone mode: generate a named schema type, not a .d.ts
    const outPath = resolve(process.cwd(), args[outIdx + 1]!);
    const baseName = basename(input, '.riv').replace(/[^a-zA-Z0-9]/g, '_');
    const nameIdx = args.indexOf('--name');
    const typeName =
      nameIdx !== -1
        ? args[nameIdx + 1]!
        : baseName.charAt(0).toUpperCase() + baseName.slice(1) + 'Schema';
    await generate(input, outPath, 'standalone', typeName);
  } else {
    if (input.startsWith('http://') || input.startsWith('https://')) {
      process.stderr.write(
        `Error: URL inputs require --out to specify the output path.\n` +
          `  Example: rive-gen-types ${input} --out ./assets/file.riv.d.ts\n`
      );
      process.exit(1);
    }
    // Default: write <file>.riv.d.ts next to the source file
    const absInput = resolve(process.cwd(), input);
    await generate(input, `${absInput}.d.ts`, 'dts');
  }
}

main().catch((err: Error) => {
  process.stderr.write(err.message + '\n');
  process.exit(1);
});
