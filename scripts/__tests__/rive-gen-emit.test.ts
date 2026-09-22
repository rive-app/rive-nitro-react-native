import { describe, test } from 'node:test';
import { expect } from 'expect';
import ts from 'typescript';
import {
  strLit,
  quoteKey,
  smRecord,
  vmRecord,
  schemaBody,
  enumTypeString,
  enumPropTypeString,
  enumsRecord,
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
      enums: { "Pet's": ["cat's", 'a|b'] },
      viewModels: {
        "It's VM": { "quote'": "enum:Pet's" },
      },
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
  };

  test('always emits viewModels, empty object when none', () => {
    expect(schemaBody(base)).toContain('viewModels: {};');
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

describe('enumsRecord', () => {
  test('emits one union per enum, never for an empty enum', () => {
    expect(enumsRecord({ Pets: ['cat', 'dog'], Empty: [] })).toBe(
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
        enums,
        undefined
      )
    ).toBe('enum:Pets');
  });
  test('inlines instance values when enumName is missing', () => {
    const inst = { enum: () => ({ values: ['a', 'b'] }) };
    expect(
      enumPropTypeString({ name: 'pet', type: 'enumType' }, enums, inst)
    ).toBe('enum:a|b');
  });
  test('inlines instance values when enumName is not a file enum', () => {
    const inst = { enum: () => ({ values: ['x'] }) };
    expect(
      enumPropTypeString(
        { name: 'pet', type: 'enumType', enumName: 'Nope' },
        enums,
        inst
      )
    ).toBe('enum:x');
  });
  test('falls back to untyped enum without any source', () => {
    expect(
      enumPropTypeString({ name: 'pet', type: 'enumType' }, enums, undefined)
    ).toBe('enum');
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
