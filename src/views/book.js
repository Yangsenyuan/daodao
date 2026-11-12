// 桌上画册：真正可以翻的书。每一张“纸”有正反两面，翻页时绕书脊旋转。
// 页序：封面 → 扉页 / 目录 → (批注页 / 作品页) × n → 后记 / 留言页 → 封底

import { albumById, itemById } from '../data/albums.js';
import { comments } from '../lib/store.js';
import { $, $$, esc, onAction, pad } from '../lib/ui.js';
import { bindGuestbook, guestbookHtml } from './guestbook.js';

function buildPages(work, items, mode) {
  const cover = itemById(work.coverId) || items[0];
  const album = albumById(work.albumId);
  const pages = [];
  pages.push(`<div class="pg pg-cover"><div class="cover-mast mono">SHIJIAN · A BOOK OF MOMENTS</div><div class="cover-art"><img src="${cover.image}" alt="" draggable="false"/></div><div class="cover-text"><span class="mono">NO. 01 · ${esc(work.creator)} 的画册</span><h1>${esc(work.title)}</h1><span class="cover-count">${items.length} 件收藏 · 来自专辑「${esc(album.name)}」</span></div><span class="tape t1"></span><span class="tape t2"></span></div>`);
  pages.push(`<div class="pg pg-text pg-preface"><span class="mono">PREFACE · 扉页</span><h2>${esc(work.title)}</h2><p>${esc(work.intro)}</p>${work.idea ? `<blockquote>“${esc(work.idea)}”</blockquote>` : ''}<span class="sign">—— ${esc(work.creator)} 装订于拾间</span></div>`);
  pages.push(`<div class="pg pg-text pg-contents"><span class="mono">CONTENTS · 目录</span><ol>${items.map((item, j) => `<li><span>${esc(item.title)}</span><i></i><span class="mono">${pad(3 + j * 2)}</span></li>`).join('')}</ol></div>`);
  items.forEach((item, j) => {
    const count = comments(work.id, item.id).length;
    pages.push(`<div class="pg pg-text pg-note"><span class="big-no">${pad(j + 1)}</span><h2>${esc(item.title)}</h2><span class="note-meta">${esc(item.artist)} · ${esc(item.era)}</span><span class="mono">${esc(item.medium)}</span><p>${esc(item.note)}</p><span class="note-origin">收藏于 ${esc(item.saved)} · 来自笔记《${esc(item.fromNote)}》</span><button class="page-comment" data-action="open-item" data-id="${item.id}" data-comment="1">${count ? `这页有 ${count} 条留言 →` : '在这一页写一句 →'}</button><span class="folio mono">${pad(3 + j * 2)}</span></div>`);
    pages.push(`<div class="pg pg-image" style="--tone:${album.tone}"><button class="pg-art" data-action="open-item" data-id="${item.id}" aria-label="细看《${esc(item.title)}》"><img src="${item.image}" alt="${esc(item.title)}" style="aspect-ratio:${item.w}/${item.h}" draggable="false"/><span class="tape t1"></span><span class="tape t2"></span></button><span class="caption mono">${pad(j + 1)} · ${esc(item.title)}</span><span class="folio mono">${pad(4 + j * 2)}</span></div>`);
  });
  pages.push(`<div class="pg pg-text pg-colophon"><span class="mono">COLOPHON · 后记</span><h2>这本画册，<br/>只印了一本。</h2><p>由 ${esc(work.creator)} 用拾间装订。内容来自小红书专辑「${esc(album.name)}」，共 ${items.length} 件收藏。</p><dl><dt>装订</dt><dd>${new Date(work.createdAt || Date.now()).toLocaleDateString('zh-CN')}</dd><dt>印数</dt><dd>1 本 · 只给你</dd><dt>图片</dt><dd>大都会艺术博物馆开放版权藏品</dd></dl></div>`);
  pages.push(`<div class="pg pg-text pg-guest"><span class="mono">LAST PAGE · 写在最后一页</span>${guestbookHtml(work, mode, { title: '最后一页的留言', placeholder: mode === 'creator' ? '写一句给翻到这里的人…' : '翻完了，想对作者说…' })}</div>`);
  pages.push(`<div class="pg pg-back"><img src="assets/mark.svg" alt="" width="44" height="44"/><b>拾间 SHIJIAN</b><span>把收藏，变成可以翻开的作品</span>${mode === 'creator' ? '' : '<button class="secondary small" data-action="remix">我也装订一本 →</button>'}<span class="barcode" aria-hidden="true"></span></div>`);
  if (pages.length % 2) pages.splice(pages.length - 1, 0, '<div class="pg pg-blank"></div>');
  return pages;
}

export function bookHtml(work, { mode }) {
  const items = work.itemIds.map(itemById).filter(Boolean);
  const pages = buildPages(work, items, mode);
  const leaves = pages.length / 2;
  return `<div class="bx" data-style="${work.style}">
    <div class="bx-stage"><div class="bx-book" data-book style="--leaves:${leaves}">
      ${Array.from({ length: leaves }, (_, i) => `<div class="bx-leaf" data-leaf="${i}" style="z-index:${leaves - i}"><div class="bx-face front">${pages[i * 2]}</div><div class="bx-face back">${pages[i * 2 + 1]}</div></div>`).join('')}
    </div></div>
    <div class="bx-controls"><button class="secondary small" data-action="bx-prev">← 上一页</button><span class="mono" data-bx-label>封面</span><button class="secondary small" data-action="bx-next">下一页 →</button></div>
    <div class="bx-hint mono">点击右页向后翻 · 点击左页向前翻 · 方向键也可以</div>
  </div>`;
}

export function mountBook(root, work, { mode, openItem, onChange, startPos = 0 }) {
  const book = $('[data-book]', root);
  const leaves = $$('.bx-leaf', book);
  const total = leaves.length;
  const label = $('[data-bx-label]', root);
  let pos = Math.min(startPos, total);

  // 按可用空间计算书的大小；--u 是“书高的 1%”，页面里的字号都基于它，保证任何屏幕都按比例缩放。
  const size = () => {
    const stage = $('.bx-stage', root);
    const availW = stage.clientWidth * 0.94;
    const availH = stage.clientHeight * 0.92;
    const h = Math.min(availH, availW / 1.44);
    book.style.setProperty('--bh', `${h}px`);
    book.style.setProperty('--bw', `${h * 1.44}px`);
    book.style.setProperty('--u', `${h / 100}px`);
  };
  size();
  window.addEventListener('resize', size);

  const layout = (animating = -1) => {
    leaves.forEach((leaf, i) => {
      const flipped = i < pos;
      leaf.classList.toggle('flipped', flipped);
      if (i !== animating) leaf.style.zIndex = flipped ? i + 1 : total - i;
    });
    book.dataset.state = pos === 0 ? 'closed' : pos === total ? 'back' : 'open';
    book.dataset.pos = pos;
    label.textContent = pos === 0 ? '封面' : pos === total ? '封底' : `第 ${pad(pos * 2 - 1)}—${pad(pos * 2)} 页 / 共 ${pad(total * 2 - 2)} 页`;
  };
  const flip = dir => {
    const next = pos + dir;
    if (next < 0 || next > total) return;
    const leaf = leaves[dir > 0 ? pos : pos - 1];
    leaf.style.zIndex = total + 10;
    pos = next;
    layout(dir > 0 ? pos - 1 : pos);
    clearTimeout(leaf._settle);
    leaf._settle = setTimeout(() => layout(), 950);
  };
  layout();

  book.addEventListener('click', event => {
    if (event.target.closest('button, input, form, a')) return;
    const rect = book.getBoundingClientRect();
    flip(event.clientX > rect.left + rect.width / 2 ? 1 : -1);
  });
  const onKey = event => {
    if (document.body.classList.contains('has-modal') || /INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return;
    if (event.key === 'ArrowRight') flip(1);
    if (event.key === 'ArrowLeft') flip(-1);
  };
  window.addEventListener('keydown', onKey);

  // 轻扫翻页（触屏）。
  let touchX = null;
  book.addEventListener('touchstart', event => { touchX = event.touches[0].clientX; }, { passive: true });
  book.addEventListener('touchend', event => {
    if (touchX === null) return;
    const dx = event.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) flip(dx < 0 ? 1 : -1);
    touchX = null;
  });

  onAction('bx-next', () => flip(1));
  onAction('bx-prev', () => flip(-1));
  onAction('open-item', button => openItem(button.dataset.id, { focusComment: Boolean(button.dataset.comment) }));
  bindGuestbook(root, work, mode, onChange);

  return () => {
    window.removeEventListener('resize', size);
    window.removeEventListener('keydown', onKey);
  };
}
