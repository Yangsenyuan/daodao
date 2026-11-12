import { artworks, collections, formats } from './data.js';

const app = document.querySelector('#app');
const dialogs = document.querySelector('#dialogs');
const toast = document.querySelector('#toast');
const state = { route: 'home', input: '', parsed: false, format: 'gallery', style: 0, title: '', subtitle: '', page: 0, activeCollection: null };

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
const byId = id => artworks.find(artwork => artwork.id === id) || artworks[0];
const icon = type => ({
  gallery: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 52h44M16 46V22l16-8 16 8v24M23 44V31h18v13M10 22h44"/><path d="M32 14v9"/></svg>',
  book: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M9 13c10-4 17-2 23 4v36c-6-6-13-8-23-4zM55 13c-10-4-17-2-23 4v36c6-6 13-8 23-4zM32 17v36"/></svg>',
  shop: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M9 26h46v29H9zM6 26l6-14h40l6 14M18 26v6M30 26v6M42 26v6M20 55V39h24v16"/><path d="M12 20h40"/></svg>',
}[type]);

function header(active = '') {
  return `<header class="topbar"><button class="brand" data-route="home" aria-label="回到拾间首页"><img src="assets/mark.svg" alt=""/><span>拾间</span><small>SHIJIAN STUDIO</small></button><nav class="top-actions"><button class="nav-link" data-route="studio">开始创造</button><button class="nav-link" data-route="community">社区灵感</button><span class="avatar" title="小岛">岛</span></nav></header>`;
}

function home() {
  const featured = collections[0];
  const cover = byId(featured.ids[0]);
  return `<div class="page">${header('home')}<main id="main">
    <section class="hero"><div class="hero-grid"></div><div class="hero-copy"><div class="eyebrow">A NEW LIFE FOR YOUR SAVED THINGS · 01</div><h1>让收藏里的喜欢，<em>重新发生。</em></h1><p class="hero-lede">拾间把你收藏过的内容，变成一场可以走进去、翻开来、分享给朋友的小世界。</p><div class="hero-actions"><button class="primary" data-route="studio">从一个专辑开始 <span>↗</span></button><button class="secondary" data-scroll="formats">看看它能变成什么</button></div><div class="hero-note">贴入一条笔记，或整个小红书专辑的链接 · 生成一个可分享的体验</div></div><div class="scroll-mark">SCROLL TO EXPLORE</div></section>
    <section class="section" id="formats"><div class="section-heading"><div><div class="section-kicker">THE FORMATS · 02</div><h2>喜欢不止<br/>一种形状。</h2></div><p>根据专辑里的内容，拾间会推荐最适合的表达。你也可以凭直觉，选一个想进入的世界。</p></div><div class="format-grid">${Object.entries(formats).map(([key, format]) => `<button class="format-card" data-route="studio" data-format="${key}"><div class="format-icon">${icon(key)}</div><div><h3>${format.name}</h3><p>${format.description}</p></div><div class="format-foot">${format.en} ↗</div></button>`).join('')}</div></section>
    <section class="section" id="community"><div class="section-heading"><div><div class="section-kicker">FROM THE COMMUNITY · 03</div><h2>有人已经<br/>在这里相遇。</h2></div><p>一份收藏，是一个人的视线；一份被分享的作品，是不同视线的相遇。</p></div><div class="featured-card" data-route="experience" data-collection="${featured.id}"><div class="featured-info"><div><div class="section-kicker" style="color:#a8a295">FEATURED LITTLE GALLERY</div><h3>${featured.title}</h3><p>${featured.subtitle}</p></div><div class="featured-meta">${featured.creator} · ${featured.tag}</div></div><div class="featured-art"><img src="${cover.image}" alt="${cover.title}"/></div></div></section>
    <section class="section community"><div class="community-grid"><div class="community-card dark"><div class="section-kicker" style="color:#aaa49a">THE IDEA</div><h3>不是整理，是重新遇见。</h3><p>收藏发生在一秒钟里。拾间想为那份喜欢，补上一段值得再次打开的时间。</p></div><div class="community-card"><div class="section-kicker">A SMALL INVITATION</div><h3>发给那个也会喜欢的人。</h3><p>生成一张邀请卡，分享给朋友，或把它发布到小红书社区，让一份私人收藏拥有新的观众。</p><button class="text-button" data-route="studio" style="align-self:flex-start;background:transparent;color:var(--ink);border-color:var(--line)">创建我的作品 →</button></div></div></section>
  </main><footer class="footer"><strong>拾间 / SHIJIAN</strong><span>把收藏变成一次体验 · 独立 Demo 2026</span></footer></div>`;
}

function studio() {
  const active = formats[state.format];
  const title = state.title || active.defaultTitle;
  return `<div class="page">${header('studio')}<main id="main" class="studio"><div class="studio-head"><div><div class="section-kicker">CREATE A NEW PIECE · 01</div><h1>把喜欢，<br/><em>交给我。</em></h1></div><p>粘贴小红书笔记或专辑链接。我们先替你搭出一个初稿，你只需要凭感觉，选一种想要的形状。</p></div>
    <div class="import-box"><input id="link-input" value="${escapeHtml(state.input)}" placeholder="粘贴小红书帖子，或整个专辑的链接" aria-label="小红书链接"/><button class="import-btn" data-action="parse">识别内容 →</button></div><div class="sample-hint">Demo 提示：可以直接点击“识别内容”，体验一份已准备好的字画收藏专辑。</div>
    ${state.parsed ? `<div class="recognised"><span class="ok">✓</span><strong>字画收藏 · 6 件内容</strong><span class="recognized-meta">已识别 · 来自小红书专辑</span></div>` : ''}
    <div class="studio-label"><h2>它想变成什么？</h2><span class="auto-pill">✦ 已为你推荐：${active.name}</span></div><div class="format-select">${Object.entries(formats).map(([key, format]) => `<button class="select-card ${state.format === key ? 'selected' : ''}" data-format="${key}"><div class="mini-icon">${icon(key)}</div><strong>${format.name}</strong><span>${format.description}</span>${key === 'gallery' ? `<div class="recommend">✦ ${format.recommendation}</div>` : ''}</button>`).join('')}</div>
    <div class="studio-label"><h2>选一个气质 <span class="mono">OPTIONAL</span></h2><span class="auto-pill">内容会自动适配</span></div><div class="style-row">${active.styles.map((style, index) => `<button class="style-chip ${state.style === index ? 'selected' : ''}" data-style="${index}">${style}</button>`).join('')}</div>
    <div class="studio-label"><h2>再告诉我一点</h2></div><div class="option-row"><div class="field"><label>作品名字</label><input id="title-input" value="${escapeHtml(title)}" placeholder="给它一个名字"/></div><div class="field"><label>想说的话 · 选填</label><input id="subtitle-input" value="${escapeHtml(state.subtitle)}" placeholder="比如：送给一起看展的人"/></div></div>
    <div class="create-row"><button class="primary" data-action="create">生成我的${active.name} <span>↗</span></button><small>通常需要几秒钟 · 先生成一个可以继续编辑的版本</small></div>
  </main></div>`;
}

function collectionFor(id) { return collections.find(item => item.id === id) || collections[0]; }
function experience(collection) {
  if (collection.type === 'book') return bookExperience(collection);
  if (collection.type === 'shop') return shopExperience(collection);
  return galleryExperience(collection);
}
function experienceNav(light = false) { return `<div class="experience-nav ${light ? 'light' : ''}"><button class="brand" data-route="home"><img src="assets/mark.svg" alt=""/><span>拾间</span><small>SHIJIAN</small></button><div class="experience-tools"><button class="tool-btn" data-action="back">← 返回编辑</button><button class="tool-btn" data-action="share">分享这份喜欢 ↗</button></div></div>`; }
function galleryExperience(collection) {
  const items = collection.ids.map(byId);
  return `<div class="experience gallery-exp">${experienceNav()}<div class="gallery-title"><div class="eyebrow">A LITTLE GALLERY · ${collection.creator}</div><h1>${escapeHtml(collection.title)}</h1><p>${escapeHtml(state.subtitle || collection.subtitle)}</p></div><div class="gallery-wall">${items.map((item, index) => `<button class="wall-piece" data-action="artwork" data-index="${index}"><img src="${item.image}" alt="${item.title}"/><div class="piece-caption">${item.title}<small>${item.artist} · ${item.year}</small></div></button>`).join('')}</div><div class="gallery-bottom">请慢慢看 · 点击作品可以进入细节</div></div>`;
}
function bookExperience(collection) {
  const items = collection.ids.map(byId); const item = items[state.page % items.length];
  return `<div class="experience book-exp">${experienceNav(true)}<div class="book-cover"><div class="book-half cover"><div class="book-tag">A BOOK OF MOMENTS · ${collection.creator}</div><h1>${escapeHtml(collection.title)}</h1><p>${escapeHtml(state.subtitle || collection.subtitle)}</p><div class="book-tag">拾间 · 2026</div><img class="book-cover-art" src="${byId(collection.ids[0]).image}" alt=""/></div><div class="book-half book-spine"><div class="book-page"><img src="${item.image}" alt="${item.title}"/><h2>${item.title}</h2><p>${item.note}</p><div class="book-tag">${String(state.page + 1).padStart(2,'0')} / ${String(items.length).padStart(2,'0')} · ${item.artist}</div></div></div></div><div class="book-controls"><button data-action="page" data-direction="prev">← 上一页</button><span>翻开这本画册 · ${state.page + 1} / ${items.length}</span><button data-action="page" data-direction="next">下一页 →</button></div></div>`;
}
function shopExperience(collection) {
  const items = collection.ids.map(byId);
  return `<div class="experience shop-exp">${experienceNav(true)}<div class="shop-header"><div class="eyebrow">A SHOP OF LITTLE JOYS · ${collection.creator}</div><h1>${escapeHtml(collection.title)}</h1><p>${escapeHtml(state.subtitle || collection.subtitle)}</p></div><div class="shop-floor"><div class="shelf"></div>${items.map((item, index) => `<button class="shop-item" style="--r:${index % 2 ? '-3deg' : '2deg'}" data-action="artwork" data-index="${index}"><img src="${item.image}" alt="${item.title}"/><span>${item.title}</span></button>`).join('')}</div><div class="shop-footer">欢迎随便看看 · 每件小物件都通往一份原始收藏</div></div>`;
}

function render() {
  if (state.route === 'home') app.innerHTML = home();
  if (state.route === 'studio') app.innerHTML = studio();
  if (state.route === 'experience') app.innerHTML = experience(state.activeCollection || collections[0]);
  bindEvents();
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function showToast(message) { toast.textContent = message; toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600); }
function go(route, options = {}) { Object.assign(state, options, { route }); render(); }
function parseInput() { state.input = document.querySelector('#link-input')?.value || ''; state.parsed = true; showToast('已识别：字画收藏专辑 · 为你准备了 6 件内容'); render(); }
function create() { state.title = document.querySelector('#title-input')?.value || formats[state.format].defaultTitle; state.subtitle = document.querySelector('#subtitle-input')?.value || ''; state.activeCollection = { ...collections[0], type: state.format, style: state.style, title: state.title, subtitle: state.subtitle || collections[0].subtitle }; state.page = 0; showToast('作品生成好了，正在打开…'); setTimeout(() => { state.route = 'experience'; render(); }, 420); }
function share() { dialogs.innerHTML = `<div class="modal" data-action="close-modal"><div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="share-title"><button class="modal-close" data-action="close-modal" aria-label="关闭">×</button><div class="section-kicker">A LITTLE INVITATION</div><h2 id="share-title">把这份喜欢，<br/>发给一个人。</h2><p>这是一个独立 Demo 中的分享预览。真正上线时，它可以生成一张小红书笔记卡片，或一条发给朋友的邀请链接。</p><div class="share-preview"><img src="${byId((state.activeCollection || collections[0]).ids[0]).image}" alt=""/><div><strong>${escapeHtml((state.activeCollection || collections[0]).title)}</strong><div class="mono">来自拾间 · ${formats[(state.activeCollection || collections[0]).type].name}</div></div></div><div class="modal-actions"><button class="primary" data-action="copy">复制邀请链接</button><button class="secondary" data-action="publish">发布到社区</button></div><div class="source-note">体验链接：shijian.studio/invite/your-little-world</div></div></div>`; }
function closeModal() { dialogs.innerHTML = ''; }
function artworkModal(item) { dialogs.innerHTML = `<div class="modal" data-action="close-modal"><div class="modal-card" role="dialog" aria-modal="true"><button class="modal-close" data-action="close-modal" aria-label="关闭">×</button><div class="share-preview" style="display:block;padding:9px"><img src="${item.image}" alt="${item.title}" style="width:100%;height:300px;object-fit:cover"/></div><div class="section-kicker">FROM THE ORIGINAL COLLECTION</div><h2>${item.title}</h2><p>${item.note}</p><div class="mono" style="margin-top:18px">${item.artist} · ${item.year} · <a href="${item.source}" target="_blank" rel="noreferrer">查看来源 ↗</a></div></div></div>`; }

function bindEvents() {
  document.querySelectorAll('[data-route]').forEach(button => button.addEventListener('click', () => {
    const route = button.dataset.route;
    if (route === 'experience') go('experience', { activeCollection: collectionFor(button.dataset.collection) });
    else go(route);
  }));
  document.querySelectorAll('[data-scroll]').forEach(button => button.addEventListener('click', () => document.querySelector(`#${button.dataset.scroll}`)?.scrollIntoView({ behavior:'smooth' })));
  document.querySelectorAll('[data-format]').forEach(button => button.addEventListener('click', () => { state.format = button.dataset.format; state.style = 0; render(); }));
  document.querySelectorAll('[data-style]').forEach(button => button.addEventListener('click', () => { state.style = Number(button.dataset.style); render(); }));
  document.querySelector('[data-action="parse"]')?.addEventListener('click', parseInput);
  document.querySelector('[data-action="create"]')?.addEventListener('click', create);
  document.querySelector('[data-action="share"]')?.addEventListener('click', share);
  document.querySelector('[data-action="back"]')?.addEventListener('click', () => go('studio', { parsed:true }));
  document.querySelectorAll('[data-action="page"]').forEach(button => button.addEventListener('click', () => { const length = (state.activeCollection || collections[1]).ids.length; state.page = (state.page + (button.dataset.direction === 'next' ? 1 : -1) + length) % length; render(); }));
  document.querySelectorAll('[data-action="artwork"]').forEach(button => button.addEventListener('click', () => { const collection = state.activeCollection || collections[0]; artworkModal(byId(collection.ids[Number(button.dataset.index)])); }));
  document.querySelectorAll('[data-action="close-modal"]').forEach(button => button.addEventListener('click', event => { if (event.target === button) closeModal(); }));
  document.querySelector('[data-action="copy"]')?.addEventListener('click', async () => { try { await navigator.clipboard.writeText('https://shijian.studio/invite/your-little-world'); } catch {} closeModal(); showToast('邀请链接已复制'); });
  document.querySelector('[data-action="publish"]')?.addEventListener('click', () => { closeModal(); showToast('已生成社区发布卡片（Demo）'); });
  document.querySelector('#link-input')?.addEventListener('keydown', event => { if (event.key === 'Enter') parseInput(); });
}

render();
