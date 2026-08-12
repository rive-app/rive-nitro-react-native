import { describe, test } from 'node:test';
import { expect } from 'expect';
import ts from 'typescript';
import {
  strLit,
  quoteKey,
  smRecord,
  vmRecord,
  schemaBody,
  assetsRecord,
  classifyAsset,
  enumTypeString,
  viewModelRefTypeString,
  type Schema,
} from '../rive-gen-types.ts';

describe('emit escaping', () => {
  test('strLit escapes quotes and backslashes', () => {
    expect(strLit('plain')).toBe("'plain'");
    expect(strLit("O'Brien")).toBe("'O\\'Brien'");
    expect(strLit('back\\slash')).toBe("'back\\\\slash'");
    expect(strLit("both\\'")).toBe("'both\\\\\\''");
  });

  test('quoteKey quotes and escapes non-identifier keys', () => {
    expect(quoteKey('Identifier_1', false)).toBe('Identifier_1');
    expect(quoteKey('Has Space', false)).toBe("'Has Space'");
    expect(quoteKey("Player's Board", false)).toBe("'Player\\'s Board'");
    expect(quoteKey('Identifier_1', true)).toBe("'Identifier_1'");
  });

  test('smRecord escapes artboard and state machine names', () => {
    const out = smRecord({ "Art'board": ["State'Machine"] });
    expect(out).toBe("    'Art\\'board': 'State\\'Machine';");
  });

  test('vmRecord escapes VM names, property names, and type strings', () => {
    const out = vmRecord({
      "VM's": { "prop's": "viewModel:Ref'd" },
    });
    expect(out).toContain("'VM\\'s': {");
    expect(out).toContain("'prop\\'s': 'viewModel:Ref\\'d';");
  });

  test('emitted body with hostile names parses as valid TypeScript', () => {
    const schema: Schema = {
      artboards: ["O'Brien", 'back\\slash'],
      defaultArtboard: "O'Brien",
      stateMachines: { "O'Brien": ["It's SM"], 'back\\slash': [] },
      viewModels: {
        "It's VM": { "quote'": "enum:a'b" },
      },
      assets: { "Font's-123": 'font' },
    };
    const body = schemaBody(schema);
    expect(parseErrors(`declare const asset: {\n${body}\n};`)).toEqual([]);
    expect(body).toContain("'O\\'Brien'");
    expect(body).toContain("'back\\\\slash'");

    // Unescaped, the same names produce a syntactically broken declaration —
    // this is what the generator used to emit.
    expect(
      parseErrors(`declare const asset: { artboards: 'O'Brien' };`)
    ).not.toEqual([]);
  });
});

function parseErrors(code: string): string[] {
  const sf = ts.createSourceFile('x.d.ts', code, ts.ScriptTarget.Latest);
  const diags = (sf as unknown as { parseDiagnostics: ts.Diagnostic[] })
    .parseDiagnostics;
  return diags.map((d) =>
    typeof d.messageText === 'string'
      ? d.messageText
      : d.messageText.messageText
  );
}

describe('schemaBody', () => {
  const base: Schema = {
    artboards: ['Main'],
    defaultArtboard: 'Main',
    stateMachines: { Main: ['SM'] },
    viewModels: {},
    assets: {},
  };

  test('always emits viewModels and assets, empty objects when none', () => {
    expect(schemaBody(base)).toContain('viewModels: {};');
    expect(schemaBody(base)).toContain('assets: {};');
  });

  test('emits assets record when present', () => {
    const body = schemaBody({
      ...base,
      assets: { 'Inter-594377': 'font', 'img-1': 'image' },
    });
    expect(body).toContain("'Inter-594377': 'font';");
    expect(body).toContain("'img-1': 'image';");
  });

  test('emits viewModels record when present', () => {
    const body = schemaBody({
      ...base,
      viewModels: { VM: { count: 'number' } },
    });
    expect(body).toContain("count: 'number';");
    expect(body).not.toContain('viewModels: {};');
  });
});

describe('enumTypeString', () => {
  test('joins values with |', () => {
    expect(enumTypeString('p', ['a', 'b'])).toBe('enum:a|b');
  });

  test('empty values fall back to untyped enum', () => {
    expect(enumTypeString('p', [])).toBe('enum');
  });

  test("a value containing the '|' separator falls back to untyped enum", () => {
    expect(enumTypeString('p', ['a|b', 'c'])).toBe('enum');
  });
});

describe('viewModelRefTypeString', () => {
  test('resolves the referenced ViewModel name via a nested instance', () => {
    const inst = {
      viewModel: (name: string) =>
        name === 'Coin'
          ? { getViewModelName: () => 'Item_Icon_Value' }
          : undefined,
    };
    expect(viewModelRefTypeString(inst, 'Coin')).toBe(
      'viewModel:Item_Icon_Value'
    );
  });

  test('falls back to untyped viewModel without a default instance', () => {
    expect(viewModelRefTypeString(undefined, 'Coin')).toBe('viewModel');
    expect(viewModelRefTypeString({ viewModel: () => undefined }, 'x')).toBe(
      'viewModel'
    );
  });

  test('falls back to untyped viewModel when introspection throws', () => {
    const inst = {
      viewModel: () => {
        throw new Error('boom');
      },
    };
    expect(viewModelRefTypeString(inst, 'Coin')).toBe('viewModel');
  });
});

describe('classifyAsset', () => {
  const font = {
    name: 'Inter',
    uniqueFilename: 'Inter-594377.ttf',
    fileExtension: 'ttf',
    isFont: true,
  };

  test('referenced asset → unique id (extension stripped) + kind', () => {
    expect(classifyAsset(font, 0)).toEqual({
      id: 'Inter-594377',
      kind: 'font',
    });
    expect(
      classifyAsset(
        { uniqueFilename: 'pic-1.png', fileExtension: 'png', isImage: true },
        0
      )
    ).toEqual({ id: 'pic-1', kind: 'image' });
    expect(
      classifyAsset(
        { uniqueFilename: 'a-2.wav', fileExtension: 'wav', isAudio: true },
        0
      )
    ).toEqual({ id: 'a-2', kind: 'audio' });
  });

  test('embedded assets are excluded', () => {
    expect(classifyAsset(font, 8680)).toBeNull();
  });

  test('unknown asset kinds are excluded', () => {
    expect(classifyAsset({ uniqueFilename: 'x-1.bin' }, 0)).toBeNull();
  });

  test('falls back to name when uniqueFilename is missing', () => {
    expect(classifyAsset({ name: 'Inter', isFont: true }, 0)).toEqual({
      id: 'Inter',
      kind: 'font',
    });
  });
});

describe('assetsRecord', () => {
  test('escapes hostile identifiers', () => {
    expect(assetsRecord({ "It's-1": 'font' })).toBe("    'It\\'s-1': 'font';");
  });
});
