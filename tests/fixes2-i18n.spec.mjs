import { test, expect } from '@playwright/test';

// 翻译修复的回归测试（要先重新构建页面）：观战 / 确认身份界面不再写死中文；英文卡面「最多 $300」的门槛不跟卡牌倍率乘；
// 「现在结算」「玩法」「继续上一局」等按钮名和帮助里引用的名字一致；日文「另交收到的」拼出来的句子读得通。
test.describe.configure({ timeout: 60_000 });

async function start(page, cfg = {}) {
  await page.addInitScript(() => { let s = 20261121; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto('/');
  await page.evaluate(cfg => {
    newGame({ names: ['A', 'B', 'C'], diff: 'full', wa: true, timed: false, minutes: 90, learn: false, ...cfg });
    enterGame();
    S.cur = 0; S.phase = 'roll';
  }, cfg);
}
const CJK = /[一-鿿]/;

test('英文：卡牌倍率 ×2 时 Marketplace 联合销售的「up to $300」门槛不乘，领的钱照乘', async ({ page }) => {
  await start(page, { dlc: ['reseller'] });
  const r = await page.evaluate(() => {
    const k = DLC_REI.findIndex(c => c && c.n === 'Marketplace 联合销售');
    __setLang('en'); S.cardMul = 2;
    return { k, txt: cardMulTxt(DLC_REI[k].e) };
  });
  expect(r.k).toBeGreaterThanOrEqual(0);
  expect(r.txt).toContain('up to $300');
  expect(r.txt).not.toContain('$600');
  expect(r.txt).toContain('$400');   // 没有的话领 $200 → ×2
});

test('英文：受邀观战弹窗、成员区按钮、确认玩家身份弹窗都不是中文', async ({ page }) => {
  await start(page);
  await page.evaluate(() => { __setLang('en'); MP.role = 'host'; MP.room = 'ABCDEF'; });
  expect(await page.evaluate(() => MP.viewerUI())).toContain('Invited spectators (0/4)');
  await page.evaluate(() => { MP.watchDialog(); });
  const dlg = page.getByRole('dialog', { name: 'Spectate by invite', exact: true });
  await expect(dlg).toBeVisible();
  expect(await dlg.innerText()).not.toMatch(CJK);
  await dlg.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dlg).toBeHidden();
  // 待确认的入座请求：先把请求删掉再关窗口，reviewJoin 就不会去给假连接发 reject
  await page.evaluate(() => { MP.pendingJoins.t1 = { conn: { open: true }, m: { name: 'Bob' }, seat: 1, previous: null, game: S }; MP.reviewJoin('t1'); });
  const who = page.getByRole('dialog', { name: 'Confirm player identity', exact: true });
  await expect(who).toBeVisible();
  expect(await who.innerText()).not.toMatch(CJK);
  await page.evaluate(() => { delete MP.pendingJoins.t1; if (VIEW_CUR) VIEW_CUR.cancel(); MP.role = null; });
});

test('英文 / 日文：按钮名和帮助里引用的一致', async ({ page }) => {
  await start(page);
  const en = await page.evaluate(() => { __setLang('en'); return { rules: _t(4113, ''), help: _t(4676, ''), score: _t(4105, ''), scoreHelp: _t(4713, ''), propose: _t(4096, ''), resume: _t(4683, ''), jail: _t(4301, ''), fis: _t(1499, '') }; });
  expect(en.rules).toBe('How to Play');
  expect(en.help).toContain('“How to Play”');
  expect(en.score).toContain('>Score now<');
  expect(en.scoreHelp).toContain('“Score now”');
  expect(en.propose).toContain('>Propose scoring now<');
  expect(en.resume).toBe('Resume last game');
  expect(en.jail).toContain('round');
  expect(en.fis).toContain('FIS attacks cost 20% less');
  const ja = await page.evaluate(() => { __setLang('ja'); return { score: _t(4105, ''), help: _t(4719, ''), fee: _tf(2799, '', 5, _t(2798, '')).replace(_t(4481, ''), _t(4482, '')) }; });
  expect(ja.score).toContain('>今すぐ集計<');
  expect(ja.help).toBe('今すぐ集計');
  expect(ja.fee).toBe('通行料を受け取るたびに別途 5% のリクエスト料金');
});
