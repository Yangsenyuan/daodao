// 把一个模拟专辑的所有图片拼成一张“联系表”PNG（每篇一行：标题、收藏数、图片），方便快速审看素材
// 用法：node scripts/xhs/sheet.mjs <专辑名>   → _xhs/albums/<专辑名>/_sheet.png
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const album = process.argv[2];
const H = Number(process.argv[3] || 180), from = Number(process.argv[4] || 1), to = Number(process.argv[5] || 999);
const dir = resolve(`_xhs/albums/${album}`);
const { notes } = JSON.parse(readFileSync(`${dir}/album.json`, 'utf-8'));
const esc = s => String(s || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const rows = notes.map((n, i) => (i + 1 < from || i + 1 > to) ? '' : `
  <div class="row">
    <div class="meta"><b>${i + 1}. ${esc(n.title)}</b><br>${esc(n.author)} · 收藏 ${esc(n.collects)} · ${(n.desc || '').length} 字<br><span>${esc((n.tags || []).slice(0, 4).join(' / '))}</span></div>
    ${n.files.map((f, k) => `<figure><img src="${pathToFileURL(`${dir}/${f}`).href}"><figcaption>${i + 1}-${k + 1}</figcaption></figure>`).join('')}
  </div>`).join('');
const html = `<!doctype html><meta charset="utf-8"><style>
  body{margin:0;padding:16px;background:#f4f1ec;font:13px/1.45 "PingFang SC","Microsoft YaHei",sans-serif;color:#222}
  h1{font-size:18px;margin:0 0 12px}
  .row{display:flex;gap:8px;align-items:flex-start;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #ddd}
  .meta{width:220px;flex:none}.meta span{color:#888}
  figure{margin:0;position:relative}figcaption{position:absolute;left:4px;top:4px;background:#000c;color:#fff;font-weight:700;padding:1px 6px;border-radius:4px}img{height:${H}px;width:auto;border-radius:4px;background:#ddd}
</style><h1>${esc(album)} · ${notes.length} 篇</h1>${rows}`;
const htmlPath = `${dir}/_sheet.html`;
writeFileSync(htmlPath, html);

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
await page.goto(pathToFileURL(htmlPath).href);
await page.waitForLoadState('networkidle');
await page.screenshot({ path: `${dir}/_sheet${from > 1 || to < 999 ? `-${from}-${to}` : ''}.png`, fullPage: true });
await browser.close();
console.log('done');
