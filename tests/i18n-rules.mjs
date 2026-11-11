// 保留现有 _t/_tf/_tr + __I18N 和内嵌手册，拦截常见第二套翻译框架及并行字典。
import { readFileSync } from 'node:fs';

const framework = /^(?:i18next(?:$|\/|-)|react-i18next$|react-intl$|vue-i18n$|intl-messageformat$|@(?:formatjs|lingui)\/)/;
const manifest = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
for (const name of Object.keys({ ...manifest.dependencies, ...manifest.devDependencies })) {
  if (framework.test(name)) throw new Error(`请复用现有翻译表，不增加翻译框架：${name}`);
}

export default {
  rules: {
    'reuse-translations': {
      meta: { type: 'problem', schema: [], messages: {
        table: '请复用 __I18N 与 _t/_tf/_tr，不新增按 en/ja 分组的平行翻译字典。',
        framework: '请复用现有翻译实现，不加载另一套翻译框架。'
      } },
      create(context) {
        const checkImport = node => {
          const name = node.source?.value ?? node.arguments?.[0]?.value;
          if (typeof name === 'string' && framework.test(name)) context.report({ node, messageId: 'framework' });
        };
        return {
          ImportExpression: checkImport,
          CallExpression(node) { if (node.callee.name === 'require') checkImport(node); },
          ObjectExpression(node) {
            const keys = node.properties.map(p => p.key?.name ?? p.key?.value);
            if (!keys.includes('en') || !keys.includes('ja')) return;
            if (node.parent.type === 'VariableDeclarator' && ['__I18N', '__MAN'].includes(node.parent.id.name)
              && node.parent.parent.parent.type === 'Program') return;
            // 现有语言切换确认提示用各语言自己的名字，不是一套翻译表。
            const parents = context.sourceCode.getAncestors(node);
            if (parents.some(p => p.type === 'FunctionDeclaration' && p.id.name === 'rerenderLang')
              && parents.some(p => p.type === 'CallExpression' && p.callee.name === 'toast')) return;
            context.report({ node, messageId: 'table' });
          }
        };
      }
    }
  }
};
