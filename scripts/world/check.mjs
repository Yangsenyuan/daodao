// 走查 + 截图：新岛主引导（起名、授权专辑）→ 建岛 → 岛岛 → 博物馆 → 日记本（翻页、打勾、回信、目录、合上）→ 访客
// 用法：先 npm run world，再 node scripts/world/check.mjs [输出目录] [desktop|mobile|all]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] || 'test-results/world';
const which = process.argv[3] || 'all';
mkdirSync(out, { recursive: true });
const base = process.env.BASE_URL || 'http://127.0.0.1:4180/';
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const errors = [];

async function run(name, opts) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`[${name}] pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && !/GPU stall|Automatic fallback/.test(m.text()))) errors.push(`[${name}] ${m.type()}: ${m.text()}`); });
  const shot = async (label, wait = 700) => { await page.waitForTimeout(wait); await page.screenshot({ path: `${out}/${name}-${label}.png` }); console.log('✓', name, label); };
  const ready = async () => { await page.waitForFunction(() => !document.getElementById('fade').classList.contains('on'), null, { timeout: 30000 }); };
  const tap = async p => opts.hasTouch ? page.touchscreen.tap(p.x, p.y) : page.mouse.click(p.x, p.y);
  const step = async (label, fn) => { try { await fn(); } catch (e) { errors.push(`[${name}] ${label}: ${e.message.split('\n')[0]}`); console.log('✗', label, e.message.split('\n')[0]); } };
  const go = async hash => { await page.evaluate(h => { location.hash = h; }, hash); await page.waitForTimeout(600); await ready(); };

  await step('onboarding', async () => {
    await page.goto(base, { waitUntil: 'load' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'load' });
    await ready();
    await shot('01-onboard-name', 1600);
    await page.locator('.shuffle').click();
    await shot('02-shuffle', 900);
    await page.locator('[data-next]').click();
    await page.locator('.onb-albums input[data-id="live"]').evaluate(el => el.click()); // 不授权“演唱会”，看空地效果
    await shot('03-onboard-albums', 700);
  });
  await step('build island', async () => {
    await page.locator('[data-go]').click();
    await shot('04-building', 3600);
    await page.waitForFunction(() => !document.querySelector('.build-chip'), null, { timeout: 20000 });
    await shot('05-island', 1800);
  });
  await step('mascot', async () => {
    const p = await page.evaluate(() => { const m = window.__island.mascot, v = m.position.clone(); v.y += 0.9; v.project(window.__engine.camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; });
    await tap(p); await page.waitForTimeout(400); await tap(p);
    await shot('06-mascot-talk', 900);
  });
  await step('plot', async () => {
    await tap(await page.evaluate(() => window.__island.screenOf('live')));
    await shot('07-plot-card', 800);
    await page.locator('[data-auth]').click();
    await shot('08-plot-authorized', 1500);
  });
  await step('museum', async () => {
    await tap(await page.evaluate(() => window.__island.screenOf('monet')));
    await page.locator('[data-enter]').click();
    await page.waitForURL(/#\/w\/monet/, { timeout: 8000 });
    await ready();
    await shot('09-museum-lobby', 1500);
    for (let i = 0; i < 3; i++) { await page.locator('.tour [data-next]').click(); await page.waitForTimeout(1700); }
    await shot('10-museum-missed', 200);
  });
  await step('diary desk', async () => {
    await go('#/');
    await tap(await page.evaluate(() => window.__island.screenOf('grow')));
    await shot('11-diary-card', 800);
    await page.locator('[data-enter]').click();
    await page.waitForURL(/#\/w\/grow/, { timeout: 8000 });
    await ready();
    await shot('12-desk', 1200);
  });
  await step('open book', async () => {
    await page.locator('.open-book').click();
    await shot('13-toc', 2600);
    if (opts.hasTouch) { await page.locator('.book-bar [data-next]').click(); await shot('13b-toc-right', 900); }
  });
  await step('turn pages', async () => {
    await page.locator('.book-bar [data-next]').click();
    await page.waitForTimeout(1300);
    await shot('14-note1', 300);
    if (opts.hasTouch) { await page.locator('.book-bar [data-next]').click(); await page.waitForTimeout(800); }
  });
  await step('check a todo', async () => {
    const p = await page.evaluate(() => window.__diary.spotOnScreen('R', 'check'));
    if (!p) throw new Error('no check spot');
    await tap(p);
    await shot('15-checked', 900);
  });
  await step('reply', async () => {
    const p = await page.evaluate(() => window.__diary.spotOnScreen('R', 'reply'));
    await tap(p);
    await page.waitForTimeout(600);
    await page.locator('.reply-box textarea').fill('后来我真的开始每周看一部纪录片了。');
    await shot('16-reply-sheet', 300);
    await page.locator('[data-save]').click();
    await shot('17-reply-saved', 1000);
  });
  await step('toc jump', async () => {
    await page.locator('.book-bar [data-toc]').click();
    await page.waitForTimeout(2200);
    const p = await page.evaluate(() => { const d = window.__diary, sp = d.book.hot.get('1:f').find(s => s.id === 'goto' && s.s === 9); return d.screenOf('R', sp.x + 200, sp.y + 30); });
    await tap(p);
    await page.waitForTimeout(3600);
    await shot('18-toc-jump', 300);
  });
  await step('the end', async () => {
    await page.evaluate(() => window.__diary.goto(14));
    await page.waitForTimeout(3500);
    if (opts.hasTouch) await shot('19-end-left', 300);
    else await shot('19-end', 300);
    if (opts.hasTouch) { await page.locator('.book-bar [data-next]').click(); await shot('19b-end-right', 900); }
  });
  await step('close', async () => {
    await page.locator('.book-bar [data-close]').click();
    await page.waitForTimeout(6500);
    await shot('20-closed', 300);
  });
  await step('visitor', async () => {
    await page.goto(base + '#/w/grow?from=' + encodeURIComponent('小鹿'), { waitUntil: 'load' });
    await page.reload({ waitUntil: 'load' });
    await ready();
    await shot('21-visitor', 1200);
  });
  const fps = await page.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; performance.now() - t0 < 2000 ? requestAnimationFrame(f) : r(Math.round(n / 2)); }; requestAnimationFrame(f); }));
  const info = await page.evaluate(() => window.__engine?.renderer.info);
  console.log(name, 'fps≈', fps, 'draw calls', info?.render.calls, 'textures', info?.memory.textures);
  await ctx.close();
}

if (which !== 'mobile') await run('desktop', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
if (which !== 'desktop') await run('mobile', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await browser.close();
console.log(errors.length ? `\n${errors.length} 个问题：\n` + errors.join('\n') : '\n无报错');
