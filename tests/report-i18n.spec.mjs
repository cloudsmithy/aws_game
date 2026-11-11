import { test, expect } from '@playwright/test';

test('新战报记录经 JSON 存档往返后，出局回合与结束类型不随语言改变', async ({ page }) => {
  await page.goto('/?demo=board');
  const result = await page.evaluate(async () => {
    switchLang('zh');
    // 跳过结束动画与弹窗；保留真实的破产、结束结算及统计函数。
    overScreens = async () => {};
    S.round = 14;
    await bankrupt(S.players[3]);
    // 新记录即使没有可识别的文案，时间线也必须使用结构字段。
    S.events.find(e => e.kind === 'out').t = '历史文字';
    S.valHist = [[1, 2000, 2000, 2000, 2000], [14, 3000, 3000, 3000, null]];
    const results = [];
    for (const kind of ['wa', 'last', 'val']) {
      gameOver(S.players[0], '历史结束原因', kind);
      S = JSON.parse(JSON.stringify(S));
      for (const lang of ['en', 'ja', 'zh']) {
        switchLang(lang);
        results.push({ kind: finKind(S.players[0], S.overWhy),
          out: reportStats(S.players[0]).trend.lines.find(l => l.q.id === 3).out,
          timelineOut: repTimeline(S.players[0], finalRank(S.players[0]), repExtra()).includes('class="pin out"') });
      }
    }
    return results;
  });
  expect(result).toEqual(['wa', 'last', 'val'].flatMap(kind =>
    Array.from({ length: 3 }, () => ({ kind, out: 14, timelineOut: true }))));
});

test('旧中英日存档保持出局、租金事件与结束类型识别，不修改历史文字', async ({ page }) => {
  await page.goto('/?demo=board');
  const result = await page.evaluate(() => {
    const results = [];
    for (const source of ['zh', 'en', 'ja']) {
      switchLang(source);
      const q = S.players[3]; q.name = 'Yuki'; q.alive = false;
      delete q.outRound; delete S.overKind;
      const out = { r: 14, t: _tf(3362, '{$0} 账户被暂停（破产）', q.name), w: 99999 };
      const rent = { r: 6, t: _tf(3099, '{$0} 付给 {$1} 过路费 ${$2}（{$3}{$4}）', 'A', 'B', 480, 'EC2', ''), w: 480 };
      const wa = _t(2933, '六大支柱全部达成'), last = _t(3654, '其他玩家都被暂停了账户');
      S.events = [out, rent];
      const original = JSON.stringify(S.events);
      for (const target of ['en', 'ja', 'zh']) {
        switchLang(target);
        results.push([reportOutRound(q), reportEventIs(out, 'out'), reportEventIs(rent, 'rent'),
          finKind(S.players[0], wa), finKind(S.players[0], last), JSON.stringify(S.events) === original]);
      }
      // 名字前缀相同不应把别人的出局事件算进来。
      results.push([reportOutRound({ id: 99, name: 'Yu', alive: false })]);
    }
    return results;
  });
  expect(result).toEqual(Array.from({ length: 3 }, () => [
    ...Array.from({ length: 3 }, () => [14, true, true, 'wa', 'last', true]), [null]
  ]).flat());
});
