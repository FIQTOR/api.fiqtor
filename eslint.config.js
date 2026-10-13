const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/**', 'coverage/**'] },
  {
    files: ['**/*.js'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Unused args are fine when they document a signature (e.g. Express
      // error handlers need the 4th `next` param to be recognised as such).
      'no-unused-vars': ['error', { args: 'after-used', argsIgnorePattern: '^_' }],
    },
  },
  {
    // Tests are ESM (vitest transforms them), so parse them as modules.
    files: ['tests/**/*.js'],
    languageOptions: {
      sourceType: 'module',
    },
  },
];
