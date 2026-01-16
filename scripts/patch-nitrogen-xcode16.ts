#!/usr/bin/env npx tsx
/**
 * Patches Nitrogen 0.33.x generated files for Xcode 16.4 compatibility.
 *
 * Swift-C++ interop on Xcode 16.4 (Swift 6.1) doesn't export nested classes properly -
 * they get flattened to static methods. Nitro 0.33.x uses nested classes for autolinking,
 * breaking builds on Xcode 16.4.
 *
 * This script adds static method wrappers and updates C++ code to use them.
 */

import * as fs from 'fs';
import * as path from 'path';

const NITROGEN_DIR = path.join(__dirname, '..', 'nitrogen', 'generated', 'ios');
const MODULE_NAME = 'RNRive';

interface HybridObject {
  name: string;
  specType: string;
}

const HYBRID_OBJECTS: HybridObject[] = [
  { name: 'Rive', specType: 'HybridRiveSpec' },
  { name: 'RiveFileFactory', specType: 'HybridRiveFileFactorySpec' },
  { name: 'RiveFile', specType: 'HybridRiveFileSpec' },
  { name: 'RiveView', specType: 'HybridRiveViewSpec' },
  { name: 'RiveImageFactory', specType: 'HybridRiveImageFactorySpec' },
];

const HYBRID_VIEWS = ['RiveView'];

function assertPatternFound(
  content: string,
  pattern: string,
  description: string
): void {
  if (!content.includes(pattern)) {
    console.error(`\nERROR: Expected pattern not found: ${description}`);
    console.error(`Pattern: "${pattern}"`);
    console.error(
      '\nThis may indicate Nitrogen output format has changed. Update patch script or Nitrogen version.'
    );
    process.exit(1);
  }
}

function patchSwiftAutolinking(): void {
  const filePath = path.join(NITROGEN_DIR, `${MODULE_NAME}Autolinking.swift`);

  if (!fs.existsSync(filePath)) {
    console.error(`ERROR: File not found: ${filePath}`);
    process.exit(1);
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;

  if (content.includes('Xcode 16.4 Compatibility Wrappers')) {
    console.log('Swift autolinking already patched, skipping.');
    return;
  }

  assertPatternFound(
    content,
    'public final class RNRiveAutolinking {',
    'RNRiveAutolinking class declaration'
  );

  for (const obj of HYBRID_OBJECTS) {
    assertPatternFound(
      content,
      `public final class Autolinked${obj.name}: AutolinkedClass {`,
      `nested class for Autolinked${obj.name}`
    );
  }

  const wrappers: string[] = [
    '',
    '  // MARK: - Xcode 16.4 Compatibility Wrappers',
    "  // Swift-C++ interop doesn't export nested classes, so we add static method wrappers",
  ];

  for (const obj of HYBRID_OBJECTS) {
    const returnType = `bridge.std__shared_ptr_${obj.specType}_`;
    wrappers.push(
      `  public static func create${obj.name}() -> ${returnType} { Autolinked${obj.name}.create() }`
    );
  }

  for (const view of HYBRID_VIEWS) {
    wrappers.push(
      `  public static func is${view}Recyclable() -> Bool { Autolinked${view}.isRecyclableHybridView }`
    );
  }

  const closingBraceIndex = content.lastIndexOf('}');
  content =
    content.slice(0, closingBraceIndex) +
    wrappers.join('\n') +
    '\n' +
    content.slice(closingBraceIndex);

  if (content === originalContent) {
    console.error('ERROR: No changes were made to Swift autolinking file');
    process.exit(1);
  }

  fs.writeFileSync(filePath, content);
  console.log(`Patched: ${filePath}`);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function patchObjCAutolinking(): void {
  const filePath = path.join(NITROGEN_DIR, `${MODULE_NAME}Autolinking.mm`);

  if (!fs.existsSync(filePath)) {
    console.error(`ERROR: File not found: ${filePath}`);
    process.exit(1);
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  let patchCount = 0;

  const alreadyPatchedPattern = `${MODULE_NAME}::${MODULE_NAME}Autolinking::create${HYBRID_OBJECTS[0]!.name}()`;
  if (content.includes(alreadyPatchedPattern)) {
    console.log('ObjC autolinking already patched, skipping.');
    return;
  }

  for (const obj of HYBRID_OBJECTS) {
    const nestedPattern = `${MODULE_NAME}::${MODULE_NAME}Autolinking::Autolinked${obj.name}::create()`;
    const staticReplacement = `${MODULE_NAME}::${MODULE_NAME}Autolinking::create${obj.name}()`;

    if (content.includes(nestedPattern)) {
      content = content.replace(
        new RegExp(escapeRegex(nestedPattern), 'g'),
        staticReplacement
      );
      patchCount++;
    }
  }

  if (patchCount === 0) {
    console.error(
      'ERROR: No nested class patterns found in ObjC autolinking file.'
    );
    process.exit(1);
  }

  if (content === originalContent) {
    console.error('ERROR: No changes were made to ObjC autolinking file');
    process.exit(1);
  }

  fs.writeFileSync(filePath, content);
  console.log(`Patched: ${filePath} (${patchCount} patterns replaced)`);
}

function patchHybridViewComponents(): void {
  const viewsDir = path.join(NITROGEN_DIR, 'c++', 'views');

  if (!fs.existsSync(viewsDir)) {
    console.log('No views directory found, skipping.');
    return;
  }

  for (const view of HYBRID_VIEWS) {
    const filePath = path.join(viewsDir, `Hybrid${view}Component.mm`);

    if (!fs.existsSync(filePath)) {
      continue;
    }

    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    let patchCount = 0;

    const alreadyPatchedPattern = `${MODULE_NAME}::${MODULE_NAME}Autolinking::create${view}()`;
    if (content.includes(alreadyPatchedPattern)) {
      console.log(`${view} component already patched, skipping.`);
      continue;
    }

    const nestedCreate = `${MODULE_NAME}::${MODULE_NAME}Autolinking::Autolinked${view}::create()`;
    const staticCreate = `${MODULE_NAME}::${MODULE_NAME}Autolinking::create${view}()`;

    if (content.includes(nestedCreate)) {
      content = content.replace(
        new RegExp(escapeRegex(nestedCreate), 'g'),
        staticCreate
      );
      patchCount++;
    }

    const nestedRecyclable = `${MODULE_NAME}::${MODULE_NAME}Autolinking::Autolinked${view}::isRecyclableHybridView()`;
    const staticRecyclable = `${MODULE_NAME}::${MODULE_NAME}Autolinking::is${view}Recyclable()`;

    if (content.includes(nestedRecyclable)) {
      content = content.replace(
        new RegExp(escapeRegex(nestedRecyclable), 'g'),
        staticRecyclable
      );
      patchCount++;
    }

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`Patched: ${filePath} (${patchCount} patterns replaced)`);
    }
  }
}

function main(): void {
  console.log('Patching Nitrogen for Xcode 16.4 compatibility...\n');
  patchSwiftAutolinking();
  patchObjCAutolinking();
  patchHybridViewComponents();
  console.log('\nDone!');
}

main();
