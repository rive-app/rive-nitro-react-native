#!/usr/bin/env bun
/**
 * Extracts artboard names and state machines from a .riv file and prints JSON to stdout.
 *
 * Usage:
 *   bun scripts/rive-extract-schema.ts path/to/file.riv
 *   bun scripts/rive-extract-schema.ts https://example.com/file.riv
 *
 * Output: { "artboards": ["Main", "Intro"], "stateMachines": { "Main": ["State Machine 1"], "Intro": ["Idle"] } }
 */

import { readFileSync } from 'fs';
import { RuntimeLoader } from '@rive-app/canvas';

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

  // On headless Linux (no WebGL) the WASM image-load counter (aa.total/aa.loaded)
  // never reaches its target because image texture creation silently fails, so
  // load() never resolves. We patch makeRenderImage to wrap img.decode so that
  // img.la() is always called after decode — a safe no-op if WebGL already fired
  // it, but unblocks the Promise when WebGL is absent.
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
        origDecode(imgBytes); // fires la() internally if WebGL succeeds
        // Defer la() to a microtask so it fires *after* the WASM's K() returns and
        // assigns H. Calling la() synchronously inside K() would resolve the Promise
        // with H=null (K hasn't returned yet), producing an empty file.
        queueMicrotask(() => (img as any).la());
      };
    }
    return img;
  };

  // CustomFileAssetLoader handles embedded assets so the runtime resolves load().
  // For fonts: decode() loads font bytes (no WebGL needed).
  // For images: decode() triggers our patched img.decode → img.la() unblocks.
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
    // Create a blank instance to resolve viewModel property references
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

  const defaultArtboard = artboards[0] ?? '';
  process.stdout.write(
    JSON.stringify(
      { artboards, defaultArtboard, stateMachines, viewModels },
      null,
      2
    ) + '\n'
  );
}

main().catch((err: Error) => {
  process.stderr.write(err.message + '\n');
  process.exit(1);
});
