import html from 'eslint-plugin-html';
import i18n from './i18n-rules.mjs';

export default [
  // 在仓库根目录跑：npm run lint（tests/ 里）会先 cd ..，下面的路径都按仓库根目录算
  { ignores: ['**/node_modules/**', '**/test-results/**', '**/playwright-report/**', '**/.playwright-cli/**', 'tools/**', '宣传片/**', '参考素材/**', '.claude/**', 'web/dist/**'] },
  {
    files: ['**/*.mjs', 'code/index.html', 'web/src/**/*.js'],
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
  // web/src/ 是 ES module；漏写 import 由 web/tools/check-modules.mjs 查（CI 也跑）
  { files: ['web/src/**/*.js'], languageOptions: { sourceType: 'module' } },
  // data/ 里就是唯一的那张翻译表（__I18N、手册），这条规则在构建产物 code/index.html 上照样查
  { files: ['web/src/**/*.js'], ignores: ['web/src/data/**'], plugins: { i18n }, rules: { 'i18n/reuse-translations': 'error' } },
  { files: ['code/index.html'], languageOptions: { sourceType: 'script' },
    plugins: { i18n }, rules: { 'i18n/reuse-translations': 'error' } }
];
