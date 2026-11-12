// 快速冒烟：打开某个地址（默认先清空本地数据），截图，打印报错
// 用法：node scripts/world/smoke.mjs "<#hash>" <输出.png> [宽 高 等待毫秒 清空=1]
import { chromium } from 'playwright';
const [hash = '', out = 'test-results/smoke.png', w = 1440, h = 900, wait = 4000, clear = '1'] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const mobile = +w < 600;
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
const p = await ctx.newPage();
p.on('pageerror', e => console.log('PAGEERROR', e.message, e.stack?.split('\n')[1]));
p.on('console', m => { if (['error', 'warning'].includes(m.type())) console.log(m.type().toUpperCase(), m.text().slice(0, 300)); });
await p.goto('http://127.0.0.1:4180/' + hash);
if (clear === '1') { await p.evaluate(() => localStorage.clear()); await p.reload(); }
await p.waitForTimeout(+wait);
await p.screenshot({ path: out });
await b.close();
