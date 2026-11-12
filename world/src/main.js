// 路由：#/ 岛岛（小岛）· #/w/monet 博物馆 · #/w/grow 日记本
// ?from=<名字>：以访客身份打开朋友分享的链接；?new=1：重新走一遍新岛主引导；?resume=1：从上次停下的地方继续
import { Engine } from './core/engine.js';
import { Island } from './worlds/island.js';
import { Museum } from './worlds/museum.js';
import { Diary } from './worlds/diary.js';
import { toast } from './ui/overlay.js';

const engine = new Engine(document.getElementById('gl'));
window.__engine = engine; // 调试与走查用
const cache = {};
const json = async url => (cache[url] ||= fetch(url).then(r => { if (!r.ok) throw new Error(url); return r.json(); }));

function parse() {
  const [path, query = ''] = location.hash.replace(/^#/, '').split('?');
  const q = new URLSearchParams(query);
  return { parts: path.split('/').filter(Boolean), from: q.get('from'), resume: q.get('resume') === '1', fresh: q.get('new') === '1' };
}

let busy = Promise.resolve();
async function route() {
  const { parts, from, resume, fresh } = parse();
  const albums = await json('data/albums.json');
  if (parts[0] === 'w' && parts[1] === 'monet') {
    const data = await json('data/monet.json');
    await engine.show(new Museum(engine, { data, albums, from, resume }), from ? `${from}的博物馆正在开门…` : '正在布展…');
    return;
  }
  if (parts[0] === 'w' && parts[1] === 'grow') {
    const data = await json('data/grow.json');
    await engine.show(new Diary(engine, { data, from, resume }), from ? `正在翻开${from}的日记本…` : '正在装订日记本…');
    return;
  }
  if (parts[0] === 'w') toast('这个世界还在捏', '先去博物馆或日记本看看吧');
  const { lines } = await json('data/island.json');
  await engine.show(new Island(engine, { albums, from, lines, fresh }), from ? `正在前往${from}的岛岛…` : '岛岛正在把收藏捏成一座岛…');
}

const err = e => { console.error(e); document.getElementById('fade-text').textContent = '加载失败了，刷新试试'; };
addEventListener('hashchange', () => { busy = busy.then(route).catch(err); });
busy = busy.then(route).catch(err);
