// 只读：按关键词搜索小红书，收集图文笔记卡片（标题、作者、点赞、封面、链接），存到 _xhs/search/<关键词>.json
// 用法：node scripts/xhs/search.mjs "<关键词>" [数量=20]
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';

const keyword = process.argv[2];
const want = Number(process.argv[3] || 20);
if (!keyword) { console.error('need keyword'); process.exit(1); }
mkdirSync('_xhs/search', { recursive: true });

const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
const context = browser.contexts()[0];
const page = context.pages().find(p => p.url().includes('xiaohongshu.com')) || await context.newPage();
const pause = ms => page.waitForTimeout(ms + Math.random() * 1200);

await page.goto(`https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}&source=web_search_result_notes`, { waitUntil: 'domcontentloaded' });
await pause(3000);
// 排序：最多收藏（= 被最多人放进专辑的内容）
const filter = page.getByText('筛选', { exact: true }).first();
if (await filter.count()) {
  await filter.hover(); await pause(1000);
  // 面板是 hover 浮层，Playwright 的 click 会因“元素不稳定”超时，直接在页面里点
  const ok = await page.evaluate(() => { const el = [...document.querySelectorAll('.tags')].find(e => e.textContent.trim() === '最多收藏'); el?.click(); return !!el; });
  console.log(ok ? 'sort: 最多收藏' : 'sort: 未找到，使用综合排序');
  await pause(3000);
  await page.mouse.move(10, 600);
  await pause(800);
}

const seen = new Map();
for (let round = 0; round < 8 && seen.size < want; round++) {
  const cards = await page.evaluate(() => [...document.querySelectorAll('section.note-item')].map(sec => {
    // 必须用带 xsec_token 的链接（a.cover），裸的 /explore/<id> 会 404
    const link = sec.querySelector('a.cover[href*="xsec_token"], a[href*="/search_result/"][href*="xsec_token"]');
    const href = link?.getAttribute('href') || '';
    const id = (href.match(/\/(?:search_result|explore)\/([0-9a-f]{24})/) || [])[1];
    return {
      id,
      href: href ? new URL(href, location.origin).href : null,
      title: sec.querySelector('.title, .footer .title span')?.textContent?.trim() || '',
      author: sec.querySelector('.author .name, .name')?.textContent?.trim() || '',
      likes: sec.querySelector('.like-wrapper .count, .count')?.textContent?.trim() || '',
      cover: sec.querySelector('img')?.getAttribute('src') || '',
      video: !!sec.querySelector('.play-icon, [class*="play"]'),
    };
  }).filter(c => c.id));
  for (const c of cards) if (!c.video && !seen.has(c.id)) seen.set(c.id, c);
  await page.mouse.wheel(0, 1400);
  await pause(1800);
}

const list = [...seen.values()].slice(0, want);
writeFileSync(`_xhs/search/${keyword.replace(/[\\/:*?"<>|\s]+/g, '_')}.json`, JSON.stringify({ keyword, at: new Date().toISOString(), list }, null, 2));
await page.screenshot({ path: '_xhs/search-last.png', timeout: 5000 }).catch(() => {});
console.log(`${keyword}: ${list.length} notes`);
for (const c of list) console.log(`- ${c.title} | ${c.author} | ♥${c.likes}`);
process.exit(0);
