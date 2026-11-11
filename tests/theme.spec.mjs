import { test, expect } from '@playwright/test';

const file = new URL('../code/index.html', import.meta.url).href;
const select = page => page.locator('[data-theme-select]:visible');

test('本地文件：默认跟随系统，手动切换持久化，恢复自动后继续响应系统', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(file);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(select(page)).toHaveValue('auto');
  await select(page).selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(select(page)).toHaveValue('light');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await select(page).selectOption('auto');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('无效的本地主题偏好回退到系统选择', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('aws-monopoly-theme', 'invalid'));
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(file);
  await expect(select(page)).toHaveValue('auto');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('主题切换只改变本机外观，保留对局状态和打开的服务面板', async ({ page }) => {
  await page.goto(file + '?demo=board');
  await page.locator('#sq1').click();
  const before = await page.evaluate(() => JSON.stringify(S));
  await page.evaluate(() => GameTheme.set('dark'));
  expect(await page.evaluate(() => JSON.stringify(S))).toBe(before);
  await expect(page.locator('#sqpop')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.evaluate(() => { closeSqPop(); render(); });
  await page.locator('#center .gmenu').evaluate(e => { e.open = true; });
  await expect(select(page)).toHaveValue('dark');
});

test('存储不可用时仍可使用，主题不依赖网络', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.getItem = () => { throw new Error('blocked'); }; Storage.prototype.setItem = () => { throw new Error('blocked'); }; });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(file);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await select(page).selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('重要文字和分类色在深浅主题下均可辨识，打印使用浅色', async ({ page }) => {
  await page.goto('/?demo=board');
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => GameTheme.set(theme), theme);
    const ratios = await page.evaluate(() => {
      const rgb = s => s.match(/[\d.]+/g).slice(0,3).map(Number);
      const lum = a => a.map(v => { v/=255; return v<=.04045?v/12.92:((v+.055)/1.055)**2.4; }).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
      const contrast = (a,b) => (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
      const probe = document.createElement('span'); document.body.appendChild(probe);
      const vars = ['ink','mut','mut2','red','green','warning-ink',...Object.keys(GROUPS).map(g=>'group-text-'+g)];
      const bg = getComputedStyle(document.querySelector('.frame')).backgroundColor;
      const values = vars.map(name => { probe.style.color='var(--'+name+')'; return { name, ratio:contrast(rgb(getComputedStyle(probe).color),rgb(bg)) }; });
      probe.remove();
      document.querySelectorAll('.pawn').forEach(e => { if (!e.textContent.trim() || !e.getBoundingClientRect().width) return; const c=getComputedStyle(e); values.push({name:'player-number',ratio:contrast(rgb(c.color),rgb(c.backgroundColor))}); });
      return values;
    });
    for (const { name, ratio } of ratios) expect(ratio, theme + ' ' + name).toBeGreaterThanOrEqual(4.5);
  }
  await page.emulateMedia({ media:'print' });
  expect(await page.locator('.frame').evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgb(255, 255, 255)');
});

test('图鉴、玩法、事件卡与手机布局支持黑夜模式，外观文案随语言切换', async ({ page }) => {
  await page.emulateMedia({ colorScheme:'dark' });
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for (const demo of ['gallery','manual','inc','rei','deed','report']) {
    await page.goto('/?demo='+demo);
    await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
    await expect(page.locator('#board .sq')).toHaveCount(48);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  }
  await page.setViewportSize({ width:390,height:844 });
  await page.goto(file);
  for (const category of ['play', 'quiz', 'rs', 'skill']) {
    await page.locator('#dlct-'+category).click();
    await expect(page.locator('#dlcTiles .tile:visible')).not.toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  }
  await page.evaluate(()=>__setLang('en'));
  await expect(page.getByLabel('Appearance',{exact:true})).toHaveValue('auto');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});


test('旧存档的玩家名颜色仍能匹配明细日志', async ({ page }) => {
  await page.goto('/?demo=board');
  await page.evaluate(() => {
    const p = cur();
    S.log.unshift(`<b style="color:${INK[p.color]}">${p.name}</b> 兼容旧存档明细 $123`);
    GameTheme.set('dark');
    showLedger(p.id);
  });
  await expect(page.locator('#vmodal')).toContainText('兼容旧存档明细');
});


test('老板键在黑夜模式下使用可读的深色编辑器', async ({ page }) => {
  await page.goto('/?demo=board');
  await page.evaluate(() => { GameTheme.set('dark'); toggleBoss(); });
  await expect(page.locator('#boss')).toBeVisible();
  const colors = await page.locator('#boss').evaluate(e => {
    const s = getComputedStyle(e);
    return { background:s.backgroundColor.match(/\d+/g).slice(0,3).map(Number), foreground:s.color.match(/\d+/g).slice(0,3).map(Number) };
  });
  expect(Math.max(...colors.background)).toBeLessThan(80);
  expect(Math.min(...colors.foreground)).toBeGreaterThan(180);
});
