import { test, expect } from '@playwright/test';
import { findClippedText } from './clipping.mjs';

// 1080P 显示器不等于 1080px 页面高度：工具栏、缩放、分屏都会改变 CSS 视口。
const sizes = [
  [1920, 1080], [1920, 940], [1920, 925], [1920, 900], [1536, 864],
  [2560, 1080], [1440, 900], [1366, 768], [1280, 600], [1201, 600],
  [1200, 800], [1024, 768], [901, 600], [900, 1100], [844, 1194],
  [1440, 500], [844, 390], [390, 844], [320, 568]
];

for (const lang of ['zh', 'en', 'ja']) {
  test(`对局内容完整可见：${lang}`, async ({ page }) => {
    await page.addInitScript(code => localStorage.setItem('aws-monopoly-lang', code), lang);
    await page.goto('/?demo=board');
    await expect(page.locator('html')).toHaveAttribute('lang', lang === 'zh' ? 'zh-CN' : lang);
    await expect(page.locator('.sq.corner')).toHaveCount(4);
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const clipped = await page.evaluate(() => {
        const failures = [];
        const title = document.querySelector('.c-head h1').getBoundingClientRect();
        const toolbar = document.querySelector('.c-head .meta').getBoundingClientRect();
        if (Math.min(title.right, toolbar.right) > Math.max(title.left, toolbar.left) + 1
          && Math.min(title.bottom, toolbar.bottom) > Math.max(title.top, toolbar.top) + 1) failures.push({ reason: '标题和工具栏重叠' });
        for (const cell of document.querySelectorAll('.sq.corner')) {
          const bounds = cell.getBoundingClientRect();
          for (const el of cell.querySelectorAll('.art img, .nm, .pr')) {
            const r = el.getBoundingClientRect();
            const textExpected = (innerWidth > 900 && innerHeight > 500)
              || (el.matches('.nm') && innerWidth >= 740 && innerWidth <= 900 && innerHeight >= innerWidth);
            if (getComputedStyle(el).display === 'none' && !textExpected && !el.matches('img')) continue; // 手机刻意只显示图标。
            if (!r.width || !r.height || (el.matches('img') && r.height < 12)) {
              failures.push({ cell: cell.id, element: el.className, reason: '应显示的图标或文字不可见' });
              continue;
            }
            if (r.top < bounds.top - 1 || r.bottom > bounds.bottom + 1 || r.left < bounds.left - 1 || r.right > bounds.right + 1
              || el.scrollHeight > el.clientHeight + 1) {
              failures.push({ cell: cell.id, element: el.className, text: el.textContent, visibleHeight: el.clientHeight, contentHeight: el.scrollHeight });
            }
          }
        }
        return failures;
      });
      expect(clipped, `${lang} ${width}×${height}：四角图标、标题及说明不能纵向裁切`).toEqual([]);
      expect(await page.evaluate(findClippedText, '#game'), `${lang} ${width}×${height}：格子、玩家卡、日志和操作区不能意外裁切文字`).toEqual([]);
    }
    // 合法最长名字和升级/容量徽章，避免只测演示局的短名字。
    await page.evaluate(() => {
      S.players[0].name = 'abcdefghijkl'; S.players[1].name = '一二三四五六七八九十甲乙';
      for (const i of [IX.ec2, IX.dynamodb, IX.rds]) { S.props[i].level = 3; S.props[i].cap = 3; }
      render();
    });
    for (const [width, height] of [[1920, 925], [1366, 768], [390, 844]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      expect(await page.evaluate(findClippedText, '#game'), `${lang} 长名字/满级/容量 ${width}×${height}`).toEqual([]);
    }
  });
}

test('裁切检测能拦截半行文字，同时允许滚动和完整行省略', async ({ page }) => {
  await page.setContent(`<style>
    #fixtures{font:16px/24px Arial;width:300px}
    #fixtures>div{width:70px;margin:8px}
    .clamp{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
  </style><section id="fixtures">
    <div id="cut-self" style="height:12px;overflow:hidden">Cut text</div>
    <div style="height:12px;overflow:hidden"><span id="cut-child">Cut child</span></div>
    <div id="cut-clamp" class="clamp" style="height:12px">Two full lines need enough space</div>
    <div id="scroll" style="height:12px;overflow:auto">Scrolling content is accessible</div>
    <div id="ellipsis" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">An intentional single line ellipsis</div>
    <div id="clamp" class="clamp">Two full lines and more small words fit then clamp</div>
  </section>`);
  const failures = await page.evaluate(findClippedText, '#fixtures');
  expect(failures.map(x => x.element).sort()).toEqual(['#cut-child', '#cut-clamp', '#cut-self']);
});

// 对局页复用同一页扫全部尺寸；弹窗用代表性组合，不做「全部弹窗 × 全部尺寸」的昂贵笛卡尔积。
const surfaces = [
  ['setup', [1920, 925], [390, 844]],
  ['deed', [1920, 925], [390, 844]],
  ['inc', [1366, 768], [844, 390]],
  ['manual', [1201, 600], [390, 844]],
  ['gallery', [1920, 925], [390, 844]],
  ['report', [1920, 925], [390, 844]]
];
for (const lang of ['zh', 'en', 'ja']) {
  test(`开局和主要弹窗文字不被意外裁切：${lang}`, async ({ page }) => {
    await page.addInitScript(code => localStorage.setItem('aws-monopoly-lang', code), lang);
    for (const [index, [kind, desktop, compact]] of surfaces.entries()) {
      const [width, height] = lang === 'en' || (lang === 'ja' && index % 2) ? compact : desktop;
      await page.setViewportSize({ width, height });
      await page.goto(kind === 'setup' ? '/' : `/?demo=${kind}`);
      await expect(page.locator('html')).toHaveAttribute('lang', lang === 'zh' ? 'zh-CN' : lang);
      const root = kind === 'setup' ? '#setup' : '#modal:not([hidden]), #vmodal:not([hidden])';
      await expect(page.locator(root)).toBeVisible();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      expect(await page.evaluate(findClippedText, root), `${lang} ${kind} ${width}×${height}`).toEqual([]);
    }
  });
}
