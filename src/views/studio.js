// 创建工作台：贴链接 / 选专辑 → 识别内容 → 推荐形式 → 可选风格与想法 → 生成。

import { albumById, albums, otherAlbums } from '../data/albums.js';
import { formatList, formats, styleOf } from '../data/formats.js';
import { describeForms, generateWork, readIdea, recommend, recommendedStyle, styleFromIdea } from '../lib/generate.js';
import { profile, saveWork } from '../lib/store.js';
import { $, $$, esc, onAction, preload, sleep, toast } from '../lib/ui.js';
import { header } from './chrome.js';
import { miniPreview } from './previews.js';

// 草稿保存在模块里：从体验页返回时，用户之前的选择还在。
const draft = { step: 'input', link: '', albumId: null, excluded: [], format: null, formatTouched: false, style: null, styleTouched: false, idea: '' };

const IDEA_EXAMPLES = ['送给一起看展的朋友', '想要深夜美术馆的感觉', '睡前慢慢看', '做成复古手账的样子'];

function matchAlbum(link) {
  const text = link.trim();
  const byLink = albums.find(album => text && text.includes(album.link.split('/').pop()));
  if (byLink) return byLink.id;
  if (/梵高|van\s?gogh/i.test(text)) return 'vangogh';
  if (/器物|小东西|壶|杯/.test(text)) return 'qiwu';
  return 'zihua';
}

const albumItems = () => albumById(draft.albumId).items.filter(item => !item.isNew);
const chosenItems = () => albumItems().filter(item => !draft.excluded.includes(item.id));
const currentStyle = () => {
  const album = albumById(draft.albumId);
  if (draft.styleTouched && formats[draft.format].styles.some(style => style.id === draft.style)) return draft.style;
  return styleFromIdea(draft.format, readIdea(draft.idea).style) || recommendedStyle(album, draft.format);
};

// ---------- 各个区块 ----------
function albumPicker() {
  return `<div class="album-picker"><div class="picker-label">或者，从我的专辑里选</div><div class="album-row">${albums.map(album => {
    const items = album.items.filter(item => !item.isNew);
    return `<button class="album-card ${draft.albumId === album.id ? 'selected' : ''}" data-action="pick-album" data-id="${album.id}"><span class="album-grid">${items.slice(0, 4).map(item => `<img src="${item.image}" alt=""/>`).join('')}</span><span class="album-name"><b>${esc(album.name)}</b><small>${items.length} 篇笔记</small></span></button>`;
  }).join('')}${otherAlbums.map(album => `<div class="album-card disabled" title="Demo 中没有准备这个专辑的样例内容"><span class="album-grid empty"><i></i><i></i><i></i><i></i></span><span class="album-name"><b>${esc(album.name)}</b><small>${album.count} 篇 · 暂无样例</small></span></div>`).join('')}</div></div>`;
}

function scanPanel(album) {
  const items = album.items.filter(item => !item.isNew);
  return `<section class="studio-block scan" id="scan"><div class="scan-head"><span class="pulse"></span><b id="scan-status">正在打开专辑「${esc(album.name)}」…</b><span class="mono" id="scan-count">0 / ${items.length}</span></div><div class="scan-grid">${items.map(item => `<span class="scan-cell"><img src="${item.image}" alt=""/></span>`).join('')}</div><div class="scan-bar"><i id="scan-progress"></i></div></section>`;
}

function contentBlock(album) {
  const items = albumItems();
  const chosen = chosenItems();
  return `<section class="studio-block" id="block-content">
    <div class="block-head"><span class="block-no">02</span><div><h2>识别到的内容</h2><p>来自专辑「${esc(album.name)}」。点一下，可以把这次不想放进去的拿掉。</p></div><span class="block-side mono">已选 ${chosen.length} / ${items.length}</span></div>
    <div class="recognised"><span class="ok">✓</span><b>${items.length} 件内容 · ${esc(album.summary)}</b><span class="tags">${[...album.tags, ...describeForms(items)].map(tag => `<span>${esc(tag)}</span>`).join('')}</span></div>
    <div class="thumb-grid">${items.map(item => {
      const off = draft.excluded.includes(item.id);
      return `<button class="thumb ${off ? 'off' : ''}" data-action="toggle-item" data-id="${item.id}" aria-pressed="${!off}" title="${esc(item.title)}"><img src="${item.image}" alt="${esc(item.title)}"/><span class="thumb-check">${off ? '＋' : '✓'}</span><span class="thumb-title">${esc(item.title)}</span></button>`;
    }).join('')}</div>
  </section>`;
}

function formatBlock(album, rec) {
  const items = chosenItems();
  return `<section class="studio-block" id="block-format">
    <div class="block-head"><span class="block-no">03</span><div><h2>它想变成什么？</h2><p>根据内容，拾间推荐了<b>${formats[rec.format].name}</b>。预览里用的就是你的收藏，凭感觉选也可以。</p></div></div>
    <div class="format-select">${formatList.map(format => {
      if (format.soon) return `<div class="select-card soon">${miniPreview('concert')}<div class="select-body"><div class="select-top"><strong>${format.name}</strong><span class="soon-chip">即将推出</span></div><p>${format.line}</p><span class="fit">适合：${format.fit}</span></div></div>`;
      const selected = draft.format === format.key;
      return `<button class="select-card ${selected ? 'selected' : ''}" data-action="pick-format" data-format="${format.key}" aria-pressed="${selected}">${miniPreview(format.key, recommendedStyle(album, format.key), items, format.name)}<div class="select-body"><div class="select-top"><strong>${format.name}</strong>${rec.format === format.key ? '<span class="rec-chip">✦ 推荐</span>' : ''}</div><p>${format.how}</p>${rec.reasons[format.key] ? `<span class="reason">${rec.format === format.key ? '推荐理由：' : ''}${esc(rec.reasons[format.key])}</span>` : ''}</div></button>`;
    }).join('')}</div>
  </section>`;
}

function styleBlock(album) {
  const format = formats[draft.format];
  const active = currentStyle();
  const recommended = recommendedStyle(album, draft.format);
  return `<section class="studio-block" id="block-style">
    <div class="block-head"><span class="block-no">04</span><div><h2>选一个气质 <span class="optional">选填</span></h2><p>风格只改变空间、材质和排版，你的收藏始终是主角。不选就用推荐的。</p></div></div>
    <div class="style-select">${format.styles.map(style => `<button class="style-card ${active === style.id ? 'selected' : ''}" data-action="pick-style" data-style="${style.id}" aria-pressed="${active === style.id}">${miniPreview(draft.format, style.id, chosenItems(), style.name)}<span class="style-body"><span class="swatches">${style.swatch.map(color => `<i style="background:${color}"></i>`).join('')}</span><strong>${style.name}${recommended === style.id ? ' <em>推荐</em>' : ''}</strong><small>${style.desc}</small></span></button>`).join('')}</div>
  </section>`;
}

function ideaFeedback() {
  const read = readIdea(draft.idea);
  const notes = [...read.notes];
  const hinted = styleFromIdea(draft.format, read.style);
  if (hinted && !draft.styleTouched) notes.push(`风格换成「${styleOf(draft.format, hinted).name}」`);
  if (!draft.idea.trim()) return '不写也没关系，拾间会按内容先做一版。';
  return notes.length ? `拾间读到了：${notes.join(' · ')}` : '拾间会把这句话写进作品的开场，作为你的策展手记。';
}

function ideaBlock() {
  return `<section class="studio-block" id="block-idea">
    <div class="block-head"><span class="block-no">05</span><div><h2>有什么特别的想法？ <span class="optional">选填</span></h2><p>一句话就够：想给谁看、想要什么感觉。</p></div></div>
    <div class="idea-box"><textarea id="idea-input" rows="2" maxlength="80" placeholder="比如：想做成一本有旧杂志感觉的画册，送给一起追星的朋友">${esc(draft.idea)}</textarea><div class="idea-examples">${IDEA_EXAMPLES.map(text => `<button class="chip" data-action="idea-example" data-text="${esc(text)}">${esc(text)}</button>`).join('')}</div><div class="idea-feedback" id="idea-feedback">${esc(ideaFeedback())}</div></div>
  </section>`;
}

function createBar(album) {
  const format = formats[draft.format];
  return `<div class="create-bar"><div class="create-summary"><span class="mono">YOUR DRAFT</span><b>「${esc(album.name)}」${chosenItems().length} 件 → ${format.name} · ${styleOf(draft.format, currentStyle()).name}</b></div><button class="primary" data-action="generate" ${chosenItems().length ? '' : 'disabled'}>生成我的${format.name} <span aria-hidden="true">↗</span></button></div>`;
}

function stepsHtml() {
  if (!draft.albumId || draft.step === 'input') return '';
  const album = albumById(draft.albumId);
  if (draft.step === 'scanning') return scanPanel(album);
  const rec = recommend(album);
  return contentBlock(album) + formatBlock(album, rec) + styleBlock(album) + ideaBlock() + createBar(album);
}

// ---------- 生成过程 ----------
const GEN_STEPS = {
  gallery: (n, rooms) => [`读取 ${n} 件作品`, `按形制分成 ${rooms} 个展厅`, '为每件作品写好导览词', '调好展厅的灯光'],
  book: n => [`读取 ${n} 件内容`, '按年代排好页序', '设计封面和跨页', '在页边写下批注'],
  shop: n => [`读取 ${n} 件收藏`, '做成明信片、书签和冰箱贴', '摆上货架，贴好价签', '挂上「营业中」'],
};

async function runGenerate() {
  const album = albumById(draft.albumId);
  const items = chosenItems();
  const work = generateWork({ albumId: album.id, itemIds: items.map(item => item.id), format: draft.format, style: draft.styleTouched ? currentStyle() : null, idea: draft.idea, creator: profile() });
  const rooms = new Set(items.map(item => ({ leaf: 's', fan: 's' }[item.form] || item.form))).size;
  const steps = GEN_STEPS[draft.format](items.length, rooms);
  if (draft.idea.trim()) steps.splice(1, 0, `读到你的想法：“${draft.idea.trim()}”`);
  const overlay = document.createElement('div');
  overlay.className = 'gen-overlay';
  overlay.innerHTML = `<div class="gen-card"><div class="gen-stack">${items.slice(0, 5).map((item, index) => `<img src="${item.image}" alt="" style="--i:${index}"/>`).join('')}</div><div class="kicker">GENERATING · ${formats[draft.format].en}</div><h2>正在把「${esc(album.name)}」<br/>变成一${draft.format === 'book' ? '本' : draft.format === 'shop' ? '家' : '场'}${formats[draft.format].name}</h2><ol class="gen-steps">${steps.map(step => `<li>${esc(step)}</li>`).join('')}</ol></div>`;
  document.body.append(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));
  const loading = preload(items.map(item => item.image));
  const lis = $$('.gen-steps li', overlay);
  for (const li of lis) { li.classList.add('doing'); await sleep(560); li.classList.replace('doing', 'done'); }
  await loading;
  saveWork(work);
  await sleep(250);
  location.hash = `#/w/${work.id}?fresh=1`;
  // 新页面渲染好之后再淡出遮罩，让“生成完成 → 第一眼”自然衔接。
  setTimeout(() => overlay.classList.remove('open'), 150);
  setTimeout(() => overlay.remove(), 650);
}

// ---------- 页面 ----------
export function studioView(query = {}) {
  if (query.album && albumById(query.album)) {
    Object.assign(draft, { albumId: query.album, step: 'scanning', excluded: [], styleTouched: false, idea: '' });
  }
  if (query.format && formats[query.format] && !formats[query.format].soon) Object.assign(draft, { format: query.format, formatTouched: true, styleTouched: false });

  const html = `<div class="page studio-page">${header('create')}<main id="main" class="studio">
    <div class="studio-head"><div><div class="kicker">CREATE A NEW PIECE</div><h1>把一个专辑，<br/><em>交给我。</em></h1></div><p>粘贴小红书笔记或专辑链接。拾间读出里面有什么，先替你做好一版；你只需要凭感觉，选一个想要的形状。</p></div>
    <section class="studio-block first"><div class="block-head"><span class="block-no">01</span><div><h2>贴入链接</h2><p>支持单条笔记、多条笔记，或整个专辑的链接。</p></div></div>
      <div class="import-box"><input id="link-input" value="${esc(draft.link)}" placeholder="https://www.xiaohongshu.com/board/…" aria-label="小红书笔记或专辑链接" autocomplete="off"/><button class="import-btn" data-action="parse">识别内容 →</button></div>
      <div class="demo-hint mono">Demo 说明：不会真的读取小红书。任意链接都会匹配到样例专辑，也可以直接从下面选一个。</div>
      <div id="album-picker">${albumPicker()}</div>
    </section>
    <div id="studio-steps">${stepsHtml()}</div>
  </main></div>`;

  function refresh({ keep = true } = {}) {
    const y = window.scrollY;
    $('#studio-steps').innerHTML = stepsHtml();
    $('#album-picker').innerHTML = albumPicker();
    if (keep) window.scrollTo({ top: y, behavior: 'instant' });
    bindIdea();
  }
  function bindIdea() {
    const input = $('#idea-input');
    if (!input) return;
    input.addEventListener('input', () => {
      draft.idea = input.value;
      $('#idea-feedback').textContent = ideaFeedback();
      const bar = $('.create-summary b');
      if (bar) bar.textContent = `「${albumById(draft.albumId).name}」${chosenItems().length} 件 → ${formats[draft.format].name} · ${styleOf(draft.format, currentStyle()).name}`;
    });
    input.addEventListener('change', () => refreshStyles());
  }
  // 想法改变风格推荐时，只刷新风格区块，避免打断输入。
  function refreshStyles() {
    const block = $('#block-style');
    if (!block) return;
    const temp = document.createElement('div');
    temp.innerHTML = styleBlock(albumById(draft.albumId));
    block.replaceWith(temp.firstElementChild);
  }

  async function startScan(albumId) {
    const album = albumById(albumId);
    const changed = draft.albumId !== albumId;
    Object.assign(draft, { albumId, step: 'scanning' });
    if (changed) Object.assign(draft, { excluded: [], styleTouched: false });
    if (!draft.formatTouched) draft.format = recommend(album).format;
    refresh();
    $('#scan')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await scanAnimation(album);
    if (draft.albumId !== albumId) return;
    draft.step = 'ready';
    refresh();
    $('#block-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    toast(`已识别「${album.name}」· 推荐做成${formats[recommend(album).format].name}`);
  }

  async function scanAnimation(album) {
    const cells = $$('.scan-cell');
    const total = cells.length;
    const status = ['正在打开专辑…', '读取笔记里的图片…', '识别内容类型…', '整理出可用的内容…'];
    for (let i = 0; i < total; i++) {
      if (!document.body.contains(cells[i])) return;
      cells[i].classList.add('in');
      $('#scan-count').textContent = `${i + 1} / ${total}`;
      $('#scan-status').textContent = status[Math.min(status.length - 1, Math.floor(i / total * status.length))];
      $('#scan-progress').style.width = `${(i + 1) / total * 100}%`;
      await sleep(150);
    }
    $('#scan-status').textContent = `识别完成：${album.summary}`;
    await sleep(450);
  }

  function mount() {
    const input = $('#link-input');
    input.addEventListener('input', () => { draft.link = input.value; });
    input.addEventListener('keydown', event => { if (event.key === 'Enter') parse(); });
    function parse() {
      draft.link = input.value.trim();
      if (draft.link && !/xiaohongshu\.com|xhslink\.com/.test(draft.link)) toast('这看起来不是小红书链接，先用样例专辑为你演示');
      startScan(matchAlbum(draft.link));
    }
    onAction('parse', parse);
    onAction('pick-album', button => { input.value = draft.link = albumById(button.dataset.id).link; startScan(button.dataset.id); });
    onAction('toggle-item', button => {
      const id = button.dataset.id;
      draft.excluded = draft.excluded.includes(id) ? draft.excluded.filter(entry => entry !== id) : [...draft.excluded, id];
      if (!chosenItems().length) toast('至少留下一件内容');
      refresh();
    });
    onAction('pick-format', button => { draft.format = button.dataset.format; draft.formatTouched = true; draft.styleTouched = false; refresh(); });
    onAction('pick-style', button => { draft.style = button.dataset.style; draft.styleTouched = true; refresh(); });
    onAction('idea-example', button => { draft.idea = button.dataset.text; refresh(); $('#idea-input')?.focus(); });
    onAction('generate', button => { button.disabled = true; runGenerate(); });
    bindIdea();
    if (draft.step === 'scanning' && draft.albumId) startScan(draft.albumId);
  }

  return { name: 'studio', title: '开始创造', html, mount };
}
