// 端到端走查：创建 → 三种体验 → 编辑 → 分享 → 访客 → 社区 → 我的作品，并截图。
// 用法：先 npm run dev，再 node scripts/e2e.mjs [截图目录]
// 需要本机有 Microsoft Edge（Playwright 的 msedge 通道）；可用 BROWSER_CHANNEL=chrome 切换。
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] || 'test-results/e2e';
mkdirSync(out, { recursive: true });
const base = process.env.BASE_URL || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.route(/fonts\.(googleapis|gstatic)\.com/, route => (process.env.WITH_FONTS ? route.continue() : route.fulfill({ status: 200, contentType: 'text/css', body: '' })));
const page = await context.newPage();
const errors = [];
const watch = p => {
  p.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  p.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
};
watch(page);
const shot = async (name, p = page, full = false) => { await p.waitForTimeout(450); await p.screenshot({ path: `${out}/${name}.png`, fullPage: full }); console.log('✓', name); };
const step = async (label, fn) => { try { await fn(); } catch (error) { errors.push(`${label}: ${error.message.split('\n')[0]}`); console.log('✗', label, error.message.split('\n')[0]); } };

await step('home', async () => {
  await page.goto(base, { waitUntil: 'load' });
  await shot('01-home', page, true);
});

await step('studio', async () => {
  await page.getByRole('link', { name: /从一个专辑开始/ }).first().click();
  await page.locator('[data-action="pick-album"][data-id="zihua"]').click();
  await page.locator('#block-content').waitFor({ timeout: 8000 });
  await page.locator('[data-action="toggle-item"]').nth(5).click();
  await page.locator('#idea-input').fill('送给一起看展的朋友，想要深夜美术馆的感觉');
  await page.locator('#idea-input').dispatchEvent('change');
  await shot('02-studio', page, true);
});

await step('generate gallery', async () => {
  await page.locator('[data-action="generate"]').click();
  await page.waitForURL(/#\/w\//, { timeout: 12000 });
  await page.locator('.gx').waitFor();
  await shot('03-gallery-entrance');
  for (let i = 0; i < 3; i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(700); }
  await shot('04-gallery-walk');
  await page.locator('.gx-piece.lit .gx-art').click();
  await page.locator('.item-view').waitFor();
  await page.locator('.item-stage').hover();
  await shot('05-item-detail');
  await page.locator('.item-view .comment-form input').fill('第一次认真看这幅画');
  await page.locator('.item-view .comment-form button').click();
  await page.keyboard.press('Escape');
});

await step('editor + book', async () => {
  await page.locator('[data-action="coach-ok"]').click().catch(() => {});
  await page.locator('[data-action="edit"]').first().click();
  await page.locator('.editor.open').waitFor();
  await shot('06-editor');
  await page.locator('[data-ed="format"][data-value="book"]').click();
  await page.locator('.bx').waitFor();
  await page.locator('[data-ed="close"]').first().click();
  await page.waitForTimeout(500);
  await shot('07-book-cover');
  await page.locator('[data-action="bx-next"]').click(); await page.waitForTimeout(1100);
  await shot('08-book-preface');
  await page.locator('[data-action="bx-next"]').click(); await page.waitForTimeout(1100);
  await shot('09-book-spread');
});

await step('shop', async () => {
  await page.locator('[data-action="edit"]').first().click();
  await page.locator('[data-ed="format"][data-value="shop"]').click();
  await page.locator('[data-ed="close"]').first().click();
  await page.locator('.sx').waitFor();
  await page.waitForTimeout(500);
  await shot('10-shop-front', page, true);
  await page.locator('.sx-enter').click();
  await page.waitForTimeout(900);
  await shot('11-shop-inside', page, true);
  await page.locator('[data-action="pick"]').first().click();
  await page.locator('.pick-view').waitFor();
  await page.locator('[data-flip]').click(); await page.waitForTimeout(800);
  await shot('12-shop-pick-back');
  await page.locator('[data-bag]').click();
  await page.keyboard.press('Escape');
  await page.locator('[data-action="checkout"]').click();
  await page.locator('[data-pay] input').fill('那只金星玻璃的，我也想要一个');
  await page.locator('[data-pay] button').click();
  await page.locator('.receipt').waitFor();
  await shot('13-shop-receipt');
  await page.keyboard.press('Escape');
});

let invite = '';
await step('share', async () => {
  await page.locator('[data-action="edit"]').first().click();
  await page.locator('[data-ed="format"][data-value="gallery"]').click();
  await page.locator('[data-ed="close"]').first().click();
  await page.locator('.wb-actions [data-action="share"]').click();
  await page.locator('.share').waitFor();
  invite = await page.locator('.link-box input').inputValue();
  await shot('14-share-friend');
  await page.locator('[data-tab="note"]').click();
  await shot('15-share-note');
  await page.locator('[data-publish]').click();
  await page.keyboard.press('Escape');
});

await step('visitor', async () => {
  const visitor = await context.newPage();
  watch(visitor);
  await visitor.goto(invite, { waitUntil: 'load' });
  await shot('16-visitor-invite', visitor);
  await visitor.locator('[data-action="enter"]').click();
  await visitor.waitForTimeout(800);
  await visitor.locator('.gx-track').evaluate(track => { track.scrollLeft = track.scrollWidth; });
  await visitor.waitForTimeout(600);
  await visitor.locator('[data-gb-form] input').first().fill('看完了，谢谢你邀请我！');
  await visitor.locator('[data-gb-form] button').first().click();
  await shot('17-visitor-exit', visitor);
  const notice = await page.locator('#toast').innerText();
  if (!notice.includes('收到 1 条新留言')) errors.push(`sync: 作者窗口的新留言提示不对（${notice}）`);
  await visitor.locator('[data-action="favorite"]').first().click();
  await visitor.close();
});

await step('explore + mine', async () => {
  await page.goto(`${base}#/explore`, { waitUntil: 'load' });
  await shot('18-explore', page, true);
  await page.goto(`${base}#/me`, { waitUntil: 'load' });
  await shot('19-mine', page, true);
  // 跨窗口同步：访客窗口里的收藏和留言，要能在作者窗口看到。
  const favorites = await page.locator('.mine-section .masonry .work-card').count();
  const status = await page.locator('.my-status').first().innerText();
  if (!favorites) errors.push('sync: 访客收藏没有出现在「收藏的作品」');
  if (!/3 条留言/.test(status)) errors.push(`sync: 作者没有看到访客留言（${status.replace(/\s+/g, ' ')}）`);
  await page.locator('.my-work a.secondary').first().click();
  await page.locator('[data-sync]').waitFor({ timeout: 4000 });
  await page.waitForTimeout(1000);
  await shot('20-sync-banner');
});

await step('community book + mobile', async () => {
  await page.goto(`${base}#/explore?f=book`, { waitUntil: 'load' });
  await page.locator('.work-cover').first().click();
  await page.locator('[data-action="enter"]').click();
  await page.waitForTimeout(800);
  for (let i = 0; i < 3; i++) { await page.locator('[data-action="bx-next"]').click(); await page.waitForTimeout(1000); }
  await shot('21-community-book');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base, { waitUntil: 'load' });
  await shot('22-mobile-home', page, true);
  await page.goto(invite, { waitUntil: 'load' });
  await page.locator('[data-action="enter"]').click();
  await page.waitForTimeout(800);
  await page.locator('.gx-track').evaluate(track => { track.scrollLeft = track.clientWidth * 1.4; });
  await shot('23-mobile-gallery');
});

console.log(errors.length ? `\n${errors.length} 个问题:\n${errors.join('\n')}` : '\n没有页面错误');
await browser.close();
process.exitCode = errors.length ? 1 : 0;
