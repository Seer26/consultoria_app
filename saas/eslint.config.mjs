import js from '@eslint/js';
import ts from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
export default ts.config(
  { ignores: ['**/node_modules/**','**/dist/**','**/*.d.ts','**/test-results/**','**/playwright-report/**'] },
  js.configs.recommended, ...ts.configs.recommended,
  { files: ['**/*.{ts,tsx,mjs,js}'], rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] }, languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  { files: ['apps/web/src/**/*.{ts,tsx}'], plugins: { 'react-hooks': hooks }, rules: hooks.configs.recommended.rules },
);
