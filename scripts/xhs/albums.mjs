// 只读：打开自己的主页 → 收藏 → 专辑，截图并列出专辑名、篇数、链接，存到 _xhs/albums.json
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('_xhs', { recursive: true });
const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
const context = browser.contexts()[0];
const page = context.pages().find(p => p.url().includes('xiaohongshu.com')) || await context.newPage();
const pause = ms => page.waitForTimeout(ms + Math.random() * 800);

const me = await page.evaluate(() => [...document.querySelectorAll('a[href*="/user/profile/"]')].map(a => a.getAttribute('href')).find(Boolean));
await page.goto(`https://www.xiaohongshu.com${me}`, { waitUntil: 'domcontentloaded' });
await pause(2500);
const profile = await page.evaluate(() => ({
  name: document.querySelector('.user-name, [class*="user-name"]')?.textContent?.trim(),
  tabs: [...document.querySelectorAll('.reds-tab-item, [class*="tab-item"], .tab')].map(t => t.textContent.trim()).filter(Boolean),
}));
console.log('profile', JSON.stringify(profile));

await page.getByText('收藏', { exact: true }).first().click();
await pause(2000);
const albumTab = page.getByText('专辑', { exact: true }).first();
if (await albumTab.count()) { await albumTab.click(); await pause(2500); }
for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 1200); await pause(900); }
await page.screenshot({ path: '_xhs/albums.png', fullPage: false });

const albums = await page.evaluate(() => [...document.querySelectorAll('a[href*="/board/"]')].map(a => ({
  href: a.href,
  text: a.innerText.trim().replace(/\s+/g, ' '),
})));
const unique = [...new Map(albums.map(a => [a.href, a])).values()];
writeFileSync('_xhs/albums.json', JSON.stringify({ me, profile, albums: unique }, null, 2));
console.log(JSON.stringify(unique, null, 1));
