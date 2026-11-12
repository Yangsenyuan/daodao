// 连接本机调试端口上的 Edge，查看小红书页面的登录状态，并把当前页面截图（含登录二维码）存到 _xhs/。
// 用法：node scripts/xhs/status.mjs [--wait]   --wait 会一直等到登录成功再退出
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const out = '_xhs';
mkdirSync(out, { recursive: true });
const wait = process.argv.includes('--wait');

const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
const context = browser.contexts()[0];
let page = context.pages().find(p => p.url().includes('xiaohongshu.com')) || context.pages()[0];
if (!page.url().includes('xiaohongshu.com')) await page.goto('https://www.xiaohongshu.com/explore');

async function state() {
  return page.evaluate(() => {
    const profile = [...document.querySelectorAll('a[href*="/user/profile/"]')].find(a => a.closest('.side-bar, .channel-list, nav, ul'));
    const loginBox = document.querySelector('.login-container, .login-modal, [class*="login-container"]');
    return { url: location.href, title: document.title, profile: profile ? profile.getAttribute('href') : null, loginBox: !!loginBox };
  });
}

let s = await state();
await page.screenshot({ path: `${out}/login-page.png` });
const qr = page.locator('.qrcode-img, img[class*="qrcode"]').first();
if (await qr.count()) await qr.screenshot({ path: `${out}/login-qr.png` }).catch(() => {});
console.log(JSON.stringify(s));

if (wait) {
  const started = Date.now();
  while (!s.profile && Date.now() - started < 15 * 60 * 1000) {
    await page.waitForTimeout(4000);
    s = await state().catch(() => s);
    // 二维码会过期刷新，持续更新截图
    if (await qr.count().catch(() => 0)) await qr.screenshot({ path: `${out}/login-qr.png` }).catch(() => {});
  }
  console.log(s.profile ? `LOGGED_IN ${s.profile}` : 'TIMEOUT');
}
await browser.close().catch(() => {}); // 只断开连接，不会关掉 Edge
