import { fixupConfigRules, fixupPluginRules } from '@eslint/compat';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import { defineConfig } from 'eslint/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default defineConfig([
  ...fixupConfigRules(compat.extends('@react-native', 'prettier')),
  {
    plugins: { prettier },
    rules: {
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'prettier/prettier': [
        'error',
        {
          quoteProps: 'consistent',
          singleQuote: true,
          tabWidth: 2,
          trailingComma: 'es5',
          useTabs: false,
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}', 'example/src/**/*.{ts,tsx}'],
    plugins: { '@typescript-eslint': fixupPluginRules(tsPlugin) },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-deprecated': 'error',
    },
  },
  {
    // Type-test files pin overload/deprecation resolution: a
    // no-deprecated disable there asserts "this call IS deprecated", so an
    // unused directive means the resolution regressed and must fail lint.
    files: ['**/*.typetest.{ts,tsx}'],
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  {
    ignores: [
      'node_modules/',
      'lib/',
      '**/.expo/',
      '**/.harness/',
      // Agent worktrees (.claude/worktrees/*) are gitignored full-repo copies;
      // linting them duplicates every finding and slows the run.
      '**/.claude/',
    ],
  },
]);
