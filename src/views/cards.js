// 作品卡片：社区灵感、首页、我的作品共用。

import { albumById, itemById } from '../data/albums.js';
import { formats } from '../data/formats.js';
import { encodeWork } from '../lib/generate.js';
import { getWork, hasLiked, isMine, likeCount, toggleLike } from '../lib/store.js';
import { esc, onAction } from '../lib/ui.js';

export const visitHref = work => `#/v/${encodeWork(work)}`;
export const workHref = work => (isMine(work.id) ? `#/w/${work.id}` : visitHref(work));

export function workCard(work, { showLike = true, href } = {}) {
  const cover = itemById(work.coverId) || itemById(work.itemIds[0]);
  const ratio = Math.min(1.35, Math.max(0.78, cover.h / cover.w));
  const format = formats[work.format];
  const album = albumById(work.albumId);
  return `<article class="work-card" data-format="${work.format}">
    <a class="work-cover" href="${href || visitHref(work)}" style="aspect-ratio:1/${ratio.toFixed(3)}">
      <img src="${cover.image}" alt="${esc(cover.title)}" loading="lazy"/>
      <span class="format-chip">${format.name}</span>
      <span class="count-chip">${work.itemIds.length} ${format.unit}</span>
    </a>
    <div class="work-meta">
      <a class="work-title" href="${href || visitHref(work)}">${esc(work.title)}</a>
      <div class="work-foot"><span class="mini-avatar">${esc(work.avatar)}</span><span class="work-author">${esc(work.creator)}</span><span class="work-album">来自专辑「${esc(album?.name || '')}」</span>
      ${showLike ? `<button class="like ${hasLiked(work.id) ? 'liked' : ''}" data-action="like" data-id="${work.id}" aria-label="喜欢">♡ <span>${likeCount(work)}</span></button>` : ''}</div>
    </div>
  </article>`;
}


// 卡片上的“喜欢”按钮：就地更新数字，不重新渲染整页。
export function registerLikeAction() {
  onAction('like', button => {
    const work = getWork(button.dataset.id);
    if (!work) return;
    const liked = toggleLike(work.id);
    button.classList.toggle('liked', liked);
    button.querySelector('span').textContent = likeCount(work);
  });
}
