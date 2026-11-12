// 审美小店：门面 → 推门进店 → 货架上的小物 → 拿起来翻面 → 放进纸袋 → 结账换一句喜欢。

import { itemById } from '../data/albums.js';
import { merchFor } from '../lib/generate.js';
import { addComment, comments } from '../lib/store.js';
import { $, esc, onAction, openModal, pad, toast } from '../lib/ui.js';
import { commenterName, commentList } from './item.js';

const bags = new Map(); // 每份作品一个纸袋，只在本次浏览中有效
const bagOf = work => { if (!bags.has(work.id)) bags.set(work.id, []); return bags.get(work.id); };

export function merch(item, m, size = '') {
  const pic = `<img src="${item.image}" alt="" draggable="false"/>`;
  const round = item.form === 'fan' ? ' round' : '';
  const body = {
    postcard: `<span class="m-paper">${pic}<span class="stamp">${pic}</span><span class="postmark"></span></span>`,
    magnet: `<span class="m-paper${round}">${pic}</span>`,
    bookmark: `<span class="m-paper">${pic}</span><span class="tassel"></span>`,
    tote: `<span class="handles"></span><span class="m-paper">${pic}</span>`,
    badge: `<span class="m-paper">${pic}</span>`,
    print: `<span class="m-paper"><span class="mat">${pic}</span></span>`,
    object: `<span class="m-paper">${pic}</span><span class="plinth"></span>`,
  }[m.kind];
  return `<span class="m m-${m.kind} ${size}" style="--ar:${item.w}/${item.h}">${body}</span>`;
}

const shelfRows = (list, perRow) => {
  const rows = [];
  for (let i = 0; i < list.length; i += perRow) rows.push(list.slice(i, i + perRow));
  return rows;
};

export function shopHtml(work, { mode }) {
  const items = work.itemIds.map(itemById).filter(Boolean);
  const goods = items.map((item, i) => ({ item, m: merchFor(item, i) }));
  const cover = itemById(work.coverId) || items[0];
  const featured = [goods.find(g => g.item.id === cover.id), ...goods.filter(g => g.item.id !== cover.id)].filter(Boolean).slice(0, 3);
  const recent = comments(work.id, null).slice(-3).reverse();
  return `<div class="sx" data-style="${work.style}" data-scene="front">
    <section class="sx-front" aria-label="店门口">
      <div class="sx-facade">
        <div class="sx-awning" aria-hidden="true"></div>
        <div class="sx-sign"><span class="mono">EST. 2026 · ${esc(work.creator)} 的小店</span><h1>${esc(work.title)}</h1></div>
        <div class="sx-body">
          <div class="sx-window"><span class="window-label mono">今日橱窗</span><div class="window-goods">${featured.map(g => merch(g.item, g.m, 'small')).join('')}</div><span class="window-glare" aria-hidden="true"></span></div>
          <button class="sx-door" data-action="enter-shop" aria-label="推门进去"><span class="door-panel"><span class="door-glass"></span><span class="open-sign">OPEN<br/><small>营业中</small></span><span class="knob"></span></span></button>
        </div>
      </div>
      <div class="sx-board"><span class="mono">店主的话</span><p>${esc(work.intro)}</p>${work.idea ? `<p class="board-idea">“${esc(work.idea)}”</p>` : ''}<span class="board-sign">—— ${esc(work.creator)}</span></div>
      <div class="sx-street" aria-hidden="true"></div>
      <button class="sx-enter primary" data-action="enter-shop">推门进去 →</button>
    </section>

    <section class="sx-inside" aria-label="店内">
      <header class="sx-inside-head"><div><span class="mono">A SHOP OF LITTLE JOYS · 店主 ${esc(work.creator)}</span><h2>${esc(work.title)}</h2><p>每件小物都来自一条收藏。拿起来看看，背面写着店主收藏它时的话。</p></div><button class="secondary small" data-action="leave-shop">← 回到门口</button></header>
      <div class="sx-room">
        <div class="sx-shelves">${shelfRows(goods, 4).map(row => `<div class="shelf-row">${row.map(g => `<button class="sx-item kind-${g.m.kind}" data-action="pick" data-id="${g.item.id}" aria-label="拿起《${esc(g.item.title)}》${g.m.name}">${merch(g.item, g.m)}<span class="price-tag"><b>${g.m.name}</b><span>${esc(g.m.price)}</span></span></button>`).join('')}</div><div class="shelf-board" aria-hidden="true"></div>`).join('')}</div>
        <aside class="sx-counter">
          <div class="counter-top"><span class="bag-icon" aria-hidden="true"></span><div><b>纸袋</b><span class="mono" data-bag-count>0 件</span></div></div>
          <ul class="bag-list" data-bag-list><li class="muted">还空着。看到喜欢的，拿起来放进来。</li></ul>
          <button class="primary" data-action="checkout" data-checkout disabled>去结账</button>
          <p class="counter-note">本店不收钱。结账时，留一句话就好。</p>
          <div class="counter-recent"><b>最近的顾客说</b><div data-recent>${commentList(recent, mode === 'creator' ? '还没有顾客。分享出去，等第一位客人。' : '你可能是今天第一位客人。')}</div></div>
          ${mode === 'creator' ? '<button class="secondary small" data-action="share">分享小店 ↗</button>' : '<button class="secondary small" data-action="remix">我也开一家 →</button>'}
        </aside>
      </div>
    </section>
  </div>`;
}

export function mountShop(root, work, { mode, openItem, onChange }) {
  const shell = $('.sx', root);
  const goods = work.itemIds.map(itemById).filter(Boolean).map((item, i) => ({ item, m: merchFor(item, i) }));
  const bag = bagOf(work);

  const renderBag = () => {
    $('[data-bag-count]', root).textContent = `${bag.length} 件`;
    $('[data-bag-list]', root).innerHTML = bag.length
      ? bag.map(id => { const g = goods.find(entry => entry.item.id === id); return g ? `<li><span>${esc(g.item.title)} · ${g.m.name}</span><span class="mono">${esc(g.m.price)}</span></li>` : ''; }).join('')
      : '<li class="muted">还空着。看到喜欢的，拿起来放进来。</li>';
    $('[data-checkout]', root).disabled = !bag.length;
  };
  renderBag();

  const enter = () => {
    shell.dataset.scene = 'opening';
    toast('叮铃——欢迎光临');
    setTimeout(() => { shell.dataset.scene = 'inside'; window.scrollTo({ top: 0, behavior: 'instant' }); }, 650);
  };
  onAction('enter-shop', enter);
  onAction('leave-shop', () => { shell.dataset.scene = 'front'; });

  // 拿起来看看：可以拖动旋转，翻到背面读收藏时的话。
  const pick = id => {
    const index = goods.findIndex(g => g.item.id === id);
    const { item, m } = goods[index];
    const inBag = bag.includes(id);
    const card = openModal(`<div class="pick-view" data-style="${work.style}">
      <div class="pick-stage" data-pick-stage><div class="pick-card" data-pick-card><div class="pick-face front">${merch(item, m, 'large')}</div><div class="pick-face back"><span class="mono">背面 · NO. ${pad(index + 1)}</span><p class="handwrite">${esc(item.note)}</p><span class="back-origin">收藏于 ${esc(item.saved)}<br/>来自笔记《${esc(item.fromNote)}》</span><span class="back-stamp">${esc(work.title)}</span></div></div><span class="pick-hint mono">左右拖动，转一转</span></div>
      <div class="pick-info"><div class="kicker">${m.name} · 第 ${index + 1} 件 / 共 ${goods.length} 件</div><h2>${esc(item.title)}</h2><div class="item-artist">${esc(item.artist)} · ${esc(item.era)}</div><div class="item-medium mono">${esc(item.medium)}</div><div class="pick-price"><span>标价</span><b>${esc(m.price)}</b></div>
        <div class="pick-actions"><button class="secondary" data-flip>翻到背面</button><button class="primary" data-bag ${inBag ? 'disabled' : ''}>${inBag ? '已在纸袋里' : '放进纸袋'}</button></div>
        <button class="link-button" data-detail>看原作细节与留言 →</button></div>
    </div>`, { className: 'modal-pick', label: `${item.title}${m.name}` });

    const stage = $('[data-pick-stage]', card);
    const turn = $('[data-pick-card]', card);
    let angle = 0; let drag = null;
    const set = (deg, animate = true) => { angle = deg; turn.style.transition = animate ? '' : 'none'; turn.style.transform = `rotateY(${deg}deg)`; };
    stage.addEventListener('pointerdown', event => { drag = { x: event.clientX, start: angle }; stage.setPointerCapture(event.pointerId); });
    stage.addEventListener('pointermove', event => { if (drag) set(drag.start + (event.clientX - drag.x) * 0.6, false); });
    const release = () => { if (!drag) return; drag = null; set(Math.round(angle / 180) * 180); };
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);
    $('[data-flip]', card).addEventListener('click', event => { set(Math.round(angle / 180) * 180 + 180); event.currentTarget.textContent = Math.round(angle / 180) % 2 ? '翻回正面' : '翻到背面'; });
    $('[data-bag]', card).addEventListener('click', event => {
      if (!bag.includes(id)) bag.push(id);
      event.currentTarget.disabled = true;
      event.currentTarget.textContent = '已在纸袋里';
      renderBag();
      $('.bag-icon', root)?.classList.remove('bump'); void $('.bag-icon', root)?.offsetWidth; $('.bag-icon', root)?.classList.add('bump');
      toast(`「${item.title}${m.name}」放进纸袋了`);
    });
    $('[data-detail]', card).addEventListener('click', () => openItem(id));
  };
  onAction('pick', button => pick(button.dataset.id));

  // 结账：不收钱，收一句话；然后打出一张小票。
  onAction('checkout', () => {
    if (!bag.length) return;
    const lines = bag.map(id => goods.find(g => g.item.id === id)).filter(Boolean);
    const card = openModal(`<div class="checkout"><div class="kicker">CHECKOUT · 结账</div><h2>这家店不收钱。</h2><p>留下一句话，就可以把这 ${lines.length} 件带走。店主会在收银台看到它。</p><ul class="checkout-list">${lines.map(g => `<li><span>${esc(g.item.title)} · ${g.m.name}</span><span class="mono">${esc(g.m.price)}</span></li>`).join('')}</ul><form class="comment-form" data-pay><input name="text" maxlength="140" placeholder="比如：那只金星玻璃的，我也想要一个" aria-label="结账留言"/><button class="primary small" type="submit">用这句话结账</button></form></div>`, { className: 'modal-checkout', label: '结账' });
    $('[data-pay]', card).addEventListener('submit', event => {
      event.preventDefault();
      const text = event.target.elements.text.value.trim();
      if (!text) { event.target.elements.text.focus(); return; }
      addComment(work.id, { itemId: null, text, name: commenterName(mode) });
      const now = new Date();
      card.querySelector('.checkout').outerHTML = `<div class="receipt-wrap"><div class="receipt"><b>${esc(work.title)}</b><span class="mono">店主 ${esc(work.creator)} · ${now.toLocaleDateString('zh-CN')} ${now.toTimeString().slice(0, 5)}</span><hr/>${lines.map(g => `<div class="r-line"><span>${esc(g.item.title)} ${g.m.name}</span><span>${esc(g.m.price)}</span></div>`).join('')}<hr/><div class="r-line total"><span>实收</span><span>一句话</span></div><p class="r-words">“${esc(text)}”</p><hr/><span class="r-thanks">谢谢光临 · 欢迎常来</span><span class="barcode" aria-hidden="true"></span></div><p class="receipt-note">小票已经递给店主了。${mode === 'creator' ? '（你正在以店主身份预览）' : ''}</p><button class="primary" data-close>继续逛逛</button></div>`;
      bag.length = 0;
      renderBag();
      $('[data-recent]', root).innerHTML = commentList(comments(work.id, null).slice(-3).reverse());
      onChange?.();
    });
  });

  return () => {};
}
