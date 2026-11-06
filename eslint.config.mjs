import html from 'eslint-plugin-html';

export default [
  { ignores: ['node_modules/**', 'test-results/**', 'playwright-report/**', '.playwright-cli/**'] },
  {
    files: ['**/*.mjs', 'index.html'],
    plugins: { html },
    languageOptions: { ecmaVersion: 'latest' },
    rules: {
      'constructor-super': 'error',
      'no-dupe-args': 'error',
      'no-dupe-class-members': 'error',
      'no-dupe-else-if': 'error',
      'no-duplicate-case': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'valid-typeof': 'error'
    }
  },
  { files: ['index.html'], languageOptions: { sourceType: 'script' } }
];
