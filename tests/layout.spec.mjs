import { test, expect } from '@playwright/test';

const sizes = [
  [1920, 1080], [1440, 900], [1366, 768], [1366, 600], [1280, 600],
  [1201, 600], [1200, 800], [1024, 768], [901, 600], [900, 600],
  [1440, 500], [1201, 500], [844, 390], [390, 844], [320, 568]
];

for (const lang of ['en', 'ja', 'zh']) {
  for (const [width, height] of [[1920, 1080], [1366, 768]]) {
    test(`玩家卡完整显示 ${lang} ${width}×${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/?demo=board');
      await page.evaluate(lang => switchLang(lang), lang);
      const list = page.locator('#side .plist');
      const checkCards = async () => {
        const overflow = await list.evaluate(el => [el, ...el.children].map(card =>
          card.scrollWidth - card.clientWidth));
        expect(overflow.every(value => value <= 1), `玩家列表和卡片不能横向裁切：${overflow}`).toBe(true);
        for (const cash of await page.locator('#side .pacc .cash').all()) {
          const fits = await cash.evaluate(el => {
            const card = el.closest('.pl').getBoundingClientRect(), rect = el.getBoundingClientRect();
            return rect.left >= card.left && rect.right <= card.right;
          });
          expect(fits, '现金和估值应在卡片内').toBe(true);
        }
      };
      await checkCards();
      for (const toggle of await page.locator('#side .plt').all()) await toggle.click();
      await checkCards();
      const columns = await list.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
      expect(columns).toBe(width >= 1800 ? 2 : 1);
      for (const details of await page.locator('#side .ledbtn').all()) await details.click({ trial: true });
      if (width >= 1800) {
        await list.evaluate(el => { el.style.width = '400px'; });
        await checkCards();
        expect(await list.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
      }
    });
  }
}

for (const [width, height] of sizes) {
  test(`棋盘和操作可达 ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/?demo=board');
    await expect(page).toHaveURL(/\/\?demo=board$/);
    await expect(page.locator('#board .sq')).toHaveCount(48);

    const layout = await page.evaluate(() => {
      const main = document.querySelector('.cmain');
      const style = getComputedStyle(main);
      return {
        pageOverflow: document.documentElement.scrollWidth - innerWidth,
        mainClips: style.display !== 'contents' && ['hidden', 'clip'].includes(style.overflowY)
          && main.scrollHeight > main.clientHeight + 1,
        cellsOutside: [...document.querySelectorAll('#board .sq')].filter(cell => {
          const rect = cell.getBoundingClientRect();
          return rect.left < -1 || rect.right > innerWidth + 1;
        }).map(cell => cell.id)
      };
    });
    expect(layout.pageOverflow, '页面不应横向溢出').toBeLessThanOrEqual(1);
    expect(layout.mainClips, '中央内容应完整显示或提供滚动，不能裁切').toBe(false);
    expect(layout.cellsOutside, '棋盘格不应超出左右边界').toEqual([]);

    // 检查真实按钮而不只看 document 宽度：overflow:hidden 可能把错误藏起来。
    const buttons = page.locator('#board button');
    for (const button of await buttons.all()) {
      if (!await button.isVisible()) continue;
      await button.scrollIntoViewIfNeeded();
      await expect(button).toBeInViewport({ ratio: 0.95 });
      if (await button.isEnabled()) await button.click({ trial: true });
    }
    expect(errors).toEqual([]);
  });
}
