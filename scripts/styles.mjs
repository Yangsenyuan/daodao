// 风格矩阵截图：3 种形式 × 3 种风格，用访客链接直接打开。
// 用法：先 npm run dev，再 node scripts/styles.mjs [截图目录]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { albums } from '../src/data/albums.js';
import { formats } from '../src/data/formats.js';
import { encodeWork } from '../src/lib/generate.js';

const out = process.argv[2] || 'test-results/styles';
mkdirSync(out, { recursive: true });
const base = process.env.BASE_URL || 'http://127.0.0.1:4173/';
const albumFor = { gallery: 'zihua', book: 'vangogh', shop: 'qiwu' };
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.route(/fonts\.(googleapis|gstatic)\.com/, route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
for (const format of ['gallery', 'book', 'shop']) {
  const album = albums.find(entry => entry.id === albumFor[format]);
  const itemIds = album.items.filter(item => !item.isNew).map(item => item.id);
  for (const style of formats[format].styles) {
    const work = { id: `s-${format}-${style.id}`, albumId: album.id, format, style: style.id, title: `${style.name}样张`, intro: '风格样张。', idea: '', itemIds, coverId: itemIds[0], creator: '测试', avatar: '测' };
    await page.goto(`${base}#/v/${encodeWork(work)}?enter=1`, { waitUntil: 'load' });
    await page.waitForTimeout(600);
    if (format === 'gallery') { await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(900); }
    if (format === 'book') { for (let i = 0; i < 2; i++) { await page.locator('[data-action="bx-next"]').click(); await page.waitForTimeout(1000); } }
    if (format === 'shop') { await page.locator('.sx-enter').click(); await page.waitForTimeout(900); }
    await page.screenshot({ path: `${out}/${format}-${style.id}.png` });
    console.log('✓', format, style.id);
  }
}
console.log(errors.length ? errors.join('\n') : '没有页面错误');
await browser.close();
