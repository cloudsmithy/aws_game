import { test, expect } from '@playwright/test';

// 信令服务器：网址参数 > 这台设备上选的 > 网站给的 peer-config.json（docker compose 自建部署）> 公共 PeerJS（GitHub Pages）
test.describe.configure({ timeout: 60_000 });
const conf = page => page.evaluate(() => ({ c: sigConf(), label: sigLabel(), opts: MP.peerOpts() }));
const deploy = (page, body) => page.route('**/peer-config.json', r => body ? r.fulfill({ contentType: 'application/json', body: JSON.stringify(body) }) : r.fulfill({ status: 404, body: '' }));

test('GitHub Pages（没有 peer-config.json）：走公共 PeerJS，页面写出来', async ({ page }) => {
  await deploy(page, null);
  await page.goto('/'); await page.evaluate(() => sigInit());
  const r = await conf(page);
  expect(r.c.host).toBe(null); expect(r.c.src).toBe('public'); expect(r.opts.host).toBeUndefined();
  expect(r.label).toContain('0.peerjs.com');
});

test('docker compose 自建（有 peer-config.json）：默认走自建，联机设置里能改回公共', async ({ page }) => {
  await deploy(page, { host: 'peer.example.com', port: 443, path: '/' });
  await page.goto('/'); await page.evaluate(() => sigInit());
  let r = await conf(page);
  expect(r.c).toMatchObject({ host: 'peer.example.com', src: 'deploy' });
  expect(r.opts).toMatchObject({ host: 'peer.example.com', port: 443, path: '/', secure: true });
  expect(r.label).toContain('peer.example.com');
  // 这台设备上选公共
  await page.evaluate(() => sigSave({ mode: 'public' }));
  r = await conf(page);
  expect(r.c).toMatchObject({ host: null, src: 'device' });
});

test('联机设置里选自建、填域名保存；网址参数 ?peerhost= 优先级最高', async ({ page }) => {
  await deploy(page, null);
  await page.goto('/'); await page.evaluate(() => sigInit());
  await page.evaluate(() => { mpNetDialog(); });
  await expect(page.locator('#sigmode')).toBeVisible();
  await page.selectOption('#sigmode', 'custom');
  await page.fill('#sighost', 'https://my.peer.cn/');
  await page.locator('#modal [data-act="mpSigSave"]').click();
  await expect(page.locator('#sigcur')).toContainText('my.peer.cn');
  expect((await conf(page)).c).toMatchObject({ host: 'my.peer.cn', src: 'device' });
  await page.goto('/?peerhost=url.peer.cn'); await page.evaluate(() => sigInit());
  expect((await conf(page)).c).toMatchObject({ host: 'url.peer.cn', src: 'url' });
});

test('建房、加入表单下面写出现在用的信令服务器', async ({ page }) => {
  await deploy(page, { host: 'peer.example.com', port: 443, path: '/' });
  await page.goto('/'); await page.evaluate(() => sigInit());
  await page.evaluate(() => mpUI('join'));
  await expect(page.locator('#mpbox .mpsig')).toContainText('peer.example.com');
});
