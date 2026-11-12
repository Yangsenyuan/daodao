// Screenshot a URL or file: node scripts/snap.mjs <url> <out.png> [width] [height] [fullPage]
import { chromium } from 'playwright';
const [url, out, w = '1440', h = '900', full = '1'] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
page.on('pageerror', e => console.log('pageerror', e.message));
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(700);
await page.screenshot({ path: out, fullPage: full === '1' });
await browser.close();
