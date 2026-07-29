/**
 * Extracts artboard names and state machines from a .riv file and prints JSON to stdout.
 *
 * Usage:
 *   node scripts/rive-extract-schema.ts path/to/file.riv
 *   node scripts/rive-extract-schema.ts https://example.com/file.riv
 *
 * Output: { "artboards": ["Main", "Intro"], "stateMachines": { "Main": ["State Machine 1"], "Intro": ["Idle"] } }
 */

import { readFileSync } from 'fs';
// Default-import + destructure: @rive-app/canvas is CJS, and Node's ESM
// loader cannot statically see its named exports (bun's interop can).
import riveCanvas from '@rive-app/canvas';
const { RuntimeLoader } = riveCanvas;
import {
  classifyAsset,
  enumTypeString,
  viewModelRefTypeString,
} from './rive-gen-types.ts';

// noUncheckedIndexedAccess: process.argv destructuring yields string | undefined
const input: string | undefined = process.argv[2];

// @rive-app/canvas checks for browser globals during WASM initialisation.
// We only call file-inspection APIs (no rendering), so minimal shims are enough.
(globalThis as any).document = {
  createElement: () => ({ getContext: () => null }),
};
(globalThis as any).Image = class {};

// The WASM runtime prints warnings (e.g. "No WebGL support") via console.
// Redirect them to stderr so our JSON output stays clean.
console.log = (...args: unknown[]) =>
  process.stderr.write(args.join(' ') + '\n');
console.warn = (...args: unknown[]) =>
  process.stderr.write(args.join(' ') + '\n');

// Catch errors from microtasks/unhandled rejections that would otherwise cause
// a silent exit with code 0 on some Bun versions (e.g. when img.la() throws in
// a queueMicrotask callback because WebGL is unavailable on Linux CI).
process.on('uncaughtException', (err) => {
  process.stderr.write(`uncaughtException: ${err.stack ?? err.message}\n`);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  process.stderr.write(`unhandledRejection: ${reason}\n`);
  process.exit(1);
});

if (!input) {
  process.stderr.write('Usage: bun rive-extract-schema.ts <path-or-url>\n');
  process.exit(1);
}
const source: string = input;

async function loadBytes(source: string): Promise<Uint8Array> {
  if (source.startsWith('http://') || source.startsWith('https://')) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${source}`);
    return new Uint8Array(await res.arrayBuffer());
  }
  return new Uint8Array(readFileSync(source));
}

async function main() {
  const bytes = await loadBytes(source);
  const runtime = await RuntimeLoader.awaitInstance();

  // Claim every referenced asset without decoding it. We only introspect
  // names/schemas — decoding (images especially) goes through render paths
  // that stall load() forever without WebGL; a pending load() then drains the
  // event loop and the process exits 0 without output.
  const assets: Record<string, string> = {};
  const assetLoader = new (runtime as any).CustomFileAssetLoader({
    loadContents: (asset: any, embeddedBytes: Uint8Array | undefined) => {
      const classified = classifyAsset(asset ?? {}, embeddedBytes?.length ?? 0);
      if (classified) assets[classified.id] = classified.kind;
      return true;
    },
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  const riveFile = await Promise.race([
    runtime.load(bytes, assetLoader, false),
    new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('load() timed out after 30000ms')),
        30_000
      );
    }),
  ]).finally(() => clearTimeout(timer));

  // load() resolves null (rather than rejecting) for unparseable bytes.
  if (!riveFile) {
    throw new Error('not a valid .riv file (load() returned null)');
  }

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
    // Create a blank instance to resolve viewModel property references
    const inst = vm.instance?.() as any;
    const props: Record<string, string> = {};
    for (const p of properties) {
      if (p.type === 'viewModel') {
        props[p.name] = viewModelRefTypeString(inst, p.name);
      } else if (p.type === 'enumType' && inst) {
        try {
          const ep = inst.enum?.(p.name);
          props[p.name] = enumTypeString(p.name, ep?.values ?? []);
        } catch {
          props[p.name] = 'enum';
        }
      } else {
        props[p.name] = p.type;
      }
    }
    viewModels[vm.name] = props;
  }

  const defaultArtboard = artboards[0] ?? '';
  process.stdout.write(
    JSON.stringify(
      { artboards, defaultArtboard, stateMachines, viewModels, assets },
      null,
      2
    ) + '\n'
  );
}

main().catch((err: Error) => {
  process.stderr.write(err.message + '\n');
  process.exit(1);
});
