import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Shared lint config for non-Next packages (`packages/*`, `scripts`, templates).
 * `apps/studio-web` keeps its own Next.js config.
 */
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
      '**/target/**',
      'packages/runtime-web/wasm/**',
      'packages/runtime-web/src/muip/catalog.generated.ts',
      '**/*.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    rules: {
      'no-eval': 'error',
      'no-new-func': 'error',
      'no-implied-eval': 'error',
      'no-restricted-globals': [
        'error',
        { name: 'eval', message: 'eval is banned in this repository (ADR-0014).' },
        { name: 'Function', message: 'new Function is banned (ADR-0014).' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'document', property: 'write', message: 'document.write is banned in the runtime.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[property.name='innerHTML']",
          message: 'innerHTML is banned; render MUIP nodes with textContent (ADR-0014).',
        },
        {
          selector: "MemberExpression[property.name='outerHTML']",
          message: 'outerHTML is banned; render MUIP nodes with textContent (ADR-0014).',
        },
        {
          selector: "MemberExpression[property.name='insertAdjacentHTML']",
          message: 'insertAdjacentHTML is banned (ADR-0014).',
        },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
);
