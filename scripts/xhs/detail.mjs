// 只读：按 search.mjs 的结果逐篇打开笔记，抓正文、标签、互动数据、前几条评论和图片，存到 _xhs/albums/<专辑名>/
// 用法：node scripts/xhs/detail.mjs <search json 路径> <专辑名> [要存够的篇数=15] [每篇最多图片=6]（跳过视频和无法浏览的，直到存够）
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const [src, album, nArg, imgArg] = process.argv.slice(2);
const limit = Number(nArg || 15), maxImages = Number(imgArg || 6);
const { keyword, list } = JSON.parse(readFileSync(src, 'utf-8'));
const dir = `_xhs/albums/${album}`;
mkdirSync(dir, { recursive: true });

const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
const context = browser.contexts()[0];
const page = context.pages().find(p => p.url().includes('xiaohongshu.com')) || await context.newPage();
const pause = ms => page.waitForTimeout(ms + Math.random() * 2500);

const out = existsSync(`${dir}/album.json`) ? JSON.parse(readFileSync(`${dir}/album.json`, 'utf-8')) : { album, keyword, notes: [] };
const done = new Set(out.notes.map(n => n.id));

let misses = 0;
for (const card of list) {
  if (out.notes.length >= limit) break;
  if (done.has(card.id)) continue;
  const token = new URL(card.href).searchParams.get('xsec_token');
  const url = `https://www.xiaohongshu.com/explore/${card.id}?xsec_token=${encodeURIComponent(token || '')}&xsec_source=pc_search`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await pause(3500);
  if (/\/404/.test(page.url())) {
    const msg = new URL(page.url()).searchParams.get('error_msg');
    console.log('skip (无法浏览):', card.title, msg || '');
    if (++misses >= 3) { console.log('STOP: 连续无法浏览，停止'); break; }
    continue;
  }
  if (/captcha|website-login/i.test(page.url()) || await page.getByText(/安全验证|请完成验证|滑块/).count()) {
    console.log('STOP: 触发了验证码，停止抓取', page.url());
    break;
  }
  const note = await page.evaluate(id => {
    const st = window.__INITIAL_STATE__;
    const raw = st?.note?.noteDetailMap?.[id]?.note;
    const n = raw?._value || raw?.value || raw;
    if (!n || !n.noteId) return null;
    return {
      id: n.noteId, type: n.type, title: n.title, desc: n.desc,
      time: n.time, ip: n.ipLocation,
      author: n.user?.nickname || n.user?.nickName, authorId: n.user?.userId,
      likes: n.interactInfo?.likedCount, collects: n.interactInfo?.collectedCount, comments: n.interactInfo?.commentCount,
      tags: (n.tagList || []).map(t => t.name),
      images: (n.imageList || []).map(i => i.urlDefault || i.url || i.infoList?.find(x => x.imageScene === 'WB_DFT')?.url).filter(Boolean),
      size: (n.imageList || []).map(i => [i.width, i.height]),
    };
  }, card.id);
  if (!note) { console.log('skip (no data)', card.id, card.title); continue; }
  if (note.type === 'video') { console.log('skip video', note.title); continue; }
  misses = 0;
  note.topComments = await page.evaluate(() => [...document.querySelectorAll('.comment-item .content, .comment-inner .content')].slice(0, 5).map(e => e.textContent.trim()).filter(Boolean));
  note.url = `https://www.xiaohongshu.com/explore/${note.id}`;
  note.files = [];
  for (const [i, img] of note.images.slice(0, maxImages).entries()) {
    try {
      const res = await context.request.get(img, { headers: { Referer: 'https://www.xiaohongshu.com/' } });
      const type = res.headers()['content-type'] || '';
      const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
      const file = `${note.id}-${i + 1}.${ext}`;
      writeFileSync(`${dir}/${file}`, await res.body());
      note.files.push(file);
    } catch (e) { console.log('  img fail', e.message.split('\n')[0]); }
  }
  out.notes.push(note);
  writeFileSync(`${dir}/album.json`, JSON.stringify(out, null, 2));
  console.log(`✓ ${note.title} | ${note.author} | 收藏${note.collects} | ${note.files.length}图 | ${(note.desc || '').length}字`);
  await pause(2500);
}
console.log(`${album}: ${out.notes.length} notes saved`);
process.exit(0);
