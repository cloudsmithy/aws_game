import html from 'eslint-plugin-html';

export default [
  // 在仓库根目录跑：npm run lint（tests/ 里）会先 cd ..，下面的路径都按仓库根目录算
  { ignores: ['**/node_modules/**', '**/test-results/**', '**/playwright-report/**', '**/.playwright-cli/**', 'tools/**', '宣传片/**', '参考素材/**', '.claude/**'] },
  {
    files: ['**/*.mjs', 'code/index.html'],
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
  { files: ['code/index.html'], languageOptions: { sourceType: 'script' } }
];
