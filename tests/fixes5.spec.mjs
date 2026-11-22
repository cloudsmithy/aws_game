import { test, expect } from '@playwright/test';

// 第五轮复查：维护窗口付钱出来要查现金、放弃按钮按 value 认、飞过去的格也能埋、没翻开的埋卡不进公开弃牌堆
test.describe.configure({ timeout: 60_000 });
async function start(page) {
  await page.addInitScript(() => { let s = 20261124; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto('/');
  await page.evaluate(() => { newGame({ names: ['A', 'B', 'C'], diff: 'full', wa: true, timed: false, minutes: 90, learn: false, dlc: [] }); enterGame(); S.cur = 0; S.phase = 'roll'; });
}

test('在维护窗口里现金不够 $500：付钱出来不扣钱、不欠债，人还在里面', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(async () => {
    const p = S.players[0]; p.jail = 0; p.jailCat = 'sec'; p.pos = IX.jail; p.cash = 200; S.turnStartAt = 0;
    await jailAct('pay'); return { cash: p.cash, debt: p.debt.length, jail: p.jail };
  });
  expect(r).toEqual({ cash: 200, debt: 0, jail: 0 });
});

test('放弃按钮按 value 认：选对手这类没有放弃项的列表，最后一项不是灰的放弃样式', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(async () => {
    const one = UI.ask({ local: true, cls: 'pick', title: 't', buttons: [{ label: 'A', value: 0 }, { label: 'B', value: 1 }, { label: 'C', value: 2 }] });
    await new Promise(r => setTimeout(r, 50));
    const a = [...document.querySelectorAll('#modal .btns button')].map(b => b.classList.contains('decl'));
    document.querySelector('#modal .btns button').click(); await one;
    const two = UI.ask({ local: true, cls: 'pick', title: 't', buttons: [{ label: 'A', value: 0 }, { label: 'B', value: 1 }, { label: '算了', value: 'x' }] });
    await new Promise(r => setTimeout(r, 50));
    const b = [...document.querySelectorAll('#modal .btns button')].map(b => b.classList.contains('decl'));
    document.querySelector('#modal .btns button').click(); await two;
    return { a, b };
  });
  expect(r).toEqual({ a: [false, false, false], b: [false, false, true] });
});

test('靠卡牌飞过去的格也算这一回合走过的，能埋 Health 卡', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(async () => {
    const p = S.players[0], t = OWNABLE.find(i => i > p.pos + 5 && SQ[i].t === 'prop');
    await flyTo(p, t, '', { passGo: false }); return trapCands(p).includes(t);
  });
  expect(r).toBe(true);
});

test('埋卡的人破产：他没翻开的卡放回牌堆底，不进公开的弃牌堆', async ({ page }) => {
  await start(page);
  const r = await page.evaluate(() => {
    S.traps = [{ by: 0, sq: OWNABLE[3], id: 5, round: 1 }]; const disc = S.incDisc.length, inc = S.inc.length;
    dropTraps(S.players[0]); return { traps: S.traps.length, disc: S.incDisc.length - disc, inc: S.inc.length - inc, last: S.inc[S.inc.length - 1] };
  });
  expect(r).toEqual({ traps: 0, disc: 0, inc: 1, last: 5 });
});
