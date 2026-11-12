// 把 _xhs/ 里的模拟专辑 + 策展方案，构建成 world/ 场景可直接读取的数据和压缩后的图片
// 用法：node scripts/world/build.mjs
// 图片压缩用本机 Edge 的 canvas 完成（不依赖 sharp 等原生模块）
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { museum, albums, today, diary, islandLines } from './curation.mjs';
let museumData, diaryData;

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage();
await page.setContent('<canvas></canvas>');

// 把一张图压到最长边 max，导出 JPEG；返回宽高
async function shrink(src, dest, max = 1280, quality = 0.84) {
  const b64 = readFileSync(src).toString('base64');
  const type = src.endsWith('.png') ? 'image/png' : src.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
  const out = await page.evaluate(async ({ b64, type, max, quality }) => {
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type }));
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale);
    const canvas = document.querySelector('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality));
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { w, h, data: btoa(s) };
  }, { b64, type, max, quality });
  writeFileSync(dest, Buffer.from(out.data, 'base64'));
  return [out.w, out.h];
}

// 正文清洗：去掉话题标签、表情代码、多余空行
const clean = s => String(s || '')
  .replace(/#[^#\n]{1,30}\[话题\]#/g, '')
  .replace(/#[^#\n]{1,30}#/g, '')
  .replace(/\[[^\]\n]{1,8}R\]/g, '')
  .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
const num = s => { s = String(s ?? ''); return s.includes('万') ? Math.round(parseFloat(s) * 1e4) : parseInt(s) || 0; };
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);

// ---------- 博物馆 ----------
{
  const src = `_xhs/albums/${museum.album}`;
  const raw = JSON.parse(readFileSync(`${src}/album.json`, 'utf-8')).notes;
  const outDir = `world/assets/${museum.id}`;
  mkdirSync(outDir, { recursive: true });
  const notes = {};
  for (const [idx, meta] of Object.entries(museum.notes)) {
    const n = raw[idx - 1];
    const img = async (k, max) => {
      const file = n.files[k - 1];
      if (!file) return null;
      const dest = `${outDir}/${idx}-${k}.jpg`;
      const [w, h] = await shrink(`${src}/${file}`, dest, max);
      return { src: `assets/${museum.id}/${idx}-${k}.jpg`, w, h, name: meta.names?.[k] || null, wide: meta.wide === k };
    };
    const exhibits = [];
    for (const k of meta.exhibits || []) exhibits.push(await img(k, meta.wide === k ? 2048 : 1280));
    const garden = [];
    for (const k of meta.garden || []) garden.push(await img(k, 1024));
    notes[idx] = {
      idx: Number(idx), id: n.id, url: n.url,
      title: n.title, author: n.author,
      likes: num(n.likes), collects: num(n.collects), comments: num(n.comments),
      postedAt: new Date(n.time).toISOString().slice(0, 10),
      desc: clean(n.desc).slice(0, 600),
      tags: n.tags.slice(0, 6),
      voices: n.topComments.filter(c => c.length >= 3 && c.length <= 60 && !/@|链接|店铺|🛒/.test(c)).slice(0, 4),
      city: meta.city, venue: meta.venue, show: meta.show, dates: meta.dates, status: meta.status,
      opensIn: meta.opens ? daysBetween(today, meta.opens) : null,
      poster: await img(meta.poster, 900),
      exhibits: exhibits.filter(Boolean), garden: garden.filter(Boolean),
    };
    console.log(`✓ ${idx} ${meta.city} ${n.title.slice(0, 18)} · ${exhibits.length} 展品`);
  }
  const count = s => Object.values(notes).filter(n => n.status === s).length;
  const data = {
    id: museum.id, album: museum.album, title: museum.title, today,
    stats: { total: Object.keys(notes).length, closed: count('closed'), open: count('open'), soon: count('soon'), flash: count('flash'), cities: new Set(Object.values(notes).map(n => n.city)).size },
    halls: museum.halls, notes,
  };
  data.subtitle = `我收藏过的 ${data.stats.total} 场展，${data.stats.cities} 座城市`;
  writeFileSync(`world/data/${museum.id}.json`, JSON.stringify(data, null, 1));
  museumData = data;
  console.log('stats', data.stats);
}

// ---------- 日记本：翻页书的每一页 ----------
{
  const src = `_xhs/albums/${diary.album}`;
  const raw = JSON.parse(readFileSync(`${src}/album.json`, 'utf-8')).notes;
  const outDir = `world/assets/${diary.id}`;
  mkdirSync(outDir, { recursive: true });
  const notes = [];
  let no = 0;
  for (const [ci, ch] of diary.chapters.entries()) {
    for (const idx of ch.notes) {
      const n = raw[idx - 1], meta = diary.notes[idx];
      const images = [];
      for (const k of meta.images) {
        const dest = `${outDir}/${idx}-${k}.jpg`;
        const [w, h] = await shrink(`${src}/${n.files[k - 1]}`, dest, 900, 0.82);
        images.push({ src: `assets/${diary.id}/${idx}-${k}.jpg`, w, h });
      }
      notes.push({
        no: ++no, idx, chapter: ci, id: n.id, url: n.url,
        title: meta.title || n.title, short: meta.short, author: n.author,
        likes: num(n.likes), collects: num(n.collects), postedAt: new Date(n.time).toISOString().slice(0, 10),
        quote: meta.quote, todo: meta.todo, voice: meta.voice, images,
      });
      console.log(`✓ 日记 ${no} ${meta.short} · ${images.length} 图`);
    }
  }
  const dates = notes.map(n => n.postedAt).sort();
  diaryData = {
    id: diary.id, album: diary.album, title: diary.title, words: diary.words,
    chapters: diary.chapters.map(c => ({ name: c.name, color: c.color })),
    stats: { total: notes.length, todos: notes.reduce((s, n) => s + n.todo.length, 0), collects: notes.reduce((s, n) => s + n.collects, 0), from: dates[0], to: dates[dates.length - 1] },
    notes,
  };
  writeFileSync(`world/data/${diary.id}.json`, JSON.stringify(diaryData, null, 1));
  console.log('diary', diaryData.stats);
}

// ---------- 岛岛的台词 ----------
{
  const wan = n => n >= 10000 ? `${(n / 10000).toFixed(1).replace(/\.0$/, '')} 万` : String(n);
  const soon = Object.values(museumData.notes).find(n => n.status === 'soon');
  const first = diaryData.notes.find(n => n.idx === 1);
  const lines = islandLines.map(l => l.replace('{opensIn}', soon.opensIn).replace('{collects1}', wan(first.collects)));
  writeFileSync('world/data/island.json', JSON.stringify({ lines }, null, 1));
  console.log('lines', lines.length);
}

// ---------- 收藏岛：每个专辑的封面与数量 ----------
{
  const list = [];
  mkdirSync('world/assets/covers', { recursive: true });
  for (const a of albums) {
    const notes = JSON.parse(readFileSync(`_xhs/albums/${a.album}/album.json`, 'utf-8')).notes;
    const first = notes.find(n => n.files.length);
    const [w, h] = await shrink(`_xhs/albums/${a.album}/${first.files[0]}`, `world/assets/covers/${a.id}.jpg`, 512);
    list.push({ ...a, count: notes.length, images: notes.reduce((s, n) => s + n.files.length, 0), cover: { src: `assets/covers/${a.id}.jpg`, w, h } });
  }
  writeFileSync('world/data/albums.json', JSON.stringify(list, null, 1));
  console.log('albums', list.map(a => `${a.name}(${a.count})`).join(' '));
}
await browser.close();
