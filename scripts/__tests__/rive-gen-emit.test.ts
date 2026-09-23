import { describe, test } from 'node:test';
import { expect } from 'expect';
import ts from 'typescript';
import {
  strLit,
  quoteKey,
  unionRecord,
  vmRecord,
  schemaBody,
  assetsRecord,
  classifyAsset,
  enumPropTypeString,
  collectEnums,
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

  test('unionRecord escapes keys and values', () => {
    const out = unionRecord({ "Art'board": ["State'Machine"] });
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
      enums: { "Pet's": ["cat's", 'a|b'] },
      viewModels: {
        "It's VM": { "quote'": "enum:Pet's" },
      },
      referencedAssets: { "Font's-123": 'font' },
    };
    const body = schemaBody(schema);
    expect(parseErrors(`declare const asset: {\n${body}\n};`)).toEqual([]);
    expect(body).toContain("'O\\'Brien'");
    expect(body).toContain("'back\\\\slash'");
    // Named enums carry '|' inside a real union member, no encoding hazard.
    expect(body).toContain("'Pet\\'s': 'cat\\'s' | 'a|b';");

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
    enums: {},
    viewModels: {},
    referencedAssets: {},
  };

  test('always emits viewModels and referencedAssets, empty objects when none', () => {
    expect(schemaBody(base)).toContain('viewModels: {};');
    expect(schemaBody(base)).toContain('referencedAssets: {};');
  });

  test('emits referencedAssets record when present', () => {
    const body = schemaBody({
      ...base,
      referencedAssets: { 'Inter-594377': 'font', 'img-1': 'image' },
    });
    expect(body).toContain("'Inter-594377': 'font';");
    expect(body).toContain("'img-1': 'image';");
  });

  test('always emits enums, empty object when none', () => {
    expect(schemaBody(base)).toContain('enums: {};');
    expect(schemaBody({ ...base, enums: { Pets: ['cat'] } })).toContain(
      "  enums: {\n    Pets: 'cat';\n  };"
    );
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

describe('unionRecord', () => {
  test('emits one union per key, never for an empty list', () => {
    expect(unionRecord({ Pets: ['cat', 'dog'], Empty: [] })).toBe(
      "    Pets: 'cat' | 'dog';\n    Empty: never;"
    );
  });
});

describe('enumPropTypeString', () => {
  const enums = { Pets: ['cat', 'dog'] };
  test('references the file-level enum when enumName is known', () => {
    expect(
      enumPropTypeString(
        { name: 'pet', type: 'enumType', enumName: 'Pets' },
        enums
      )
    ).toBe('enum:Pets');
  });
  test('is untyped without an enumName (built-in enums)', () => {
    expect(enumPropTypeString({ name: 'pet', type: 'enumType' }, enums)).toBe(
      'enum'
    );
  });
  test('is untyped when enumName is not a file enum', () => {
    expect(
      enumPropTypeString(
        { name: 'pet', type: 'enumType', enumName: 'Nope' },
        enums
      )
    ).toBe('enum');
  });
});

describe('collectEnums', () => {
  test('skips the unnamed built-in enums the runtime lists', () => {
    const file = {
      enums: () => [
        { name: '', values: ['screen', 'normal'] },
        { name: 'Status', values: ['idle'] },
      ],
    };
    expect(collectEnums(file)).toEqual({ Status: ['idle'] });
  });

  test('keeps an enum named __proto__ as an own key', () => {
    const file = { enums: () => [{ name: '__proto__', values: ['a'] }] };
    const enums = collectEnums(file);
    expect(Object.keys(enums)).toEqual(['__proto__']);
    expect(
      enumPropTypeString(
        { name: 'p', type: 'enumType', enumName: '__proto__' },
        enums
      )
    ).toBe('enum:__proto__');
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
