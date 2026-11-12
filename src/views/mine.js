// 我的作品：自己做的作品（含专辑更新提示、发布状态）+ 收藏的别人的作品。

import { albumById, itemById } from '../data/albums.js';
import { formats, styleOf } from '../data/formats.js';
import { decodeWork, newItemsFor } from '../lib/generate.js';
import { comments, getWork, isPublished, listFavorites, listWorks, resetDemo } from '../lib/store.js';
import { esc, onAction, toast } from '../lib/ui.js';
import { footer, header } from './chrome.js';
import { visitHref, workCard } from './cards.js';
import { openShare } from './share.js';

const ago = time => {
  const minutes = Math.round((Date.now() - time) / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} 小时前`;
  return new Date(time).toLocaleDateString('zh-CN');
};

function row(work) {
  const cover = itemById(work.coverId) || itemById(work.itemIds[0]);
  const album = albumById(work.albumId);
  const fresh = work.dismissedNew ? [] : newItemsFor(work);
  const count = comments(work.id).length;
  return `<article class="my-work">
    <a class="my-cover" href="#/w/${work.id}"><img src="${cover.image}" alt=""/><span class="format-chip">${formats[work.format].name}</span></a>
    <div class="my-info">
      <a class="my-title" href="#/w/${work.id}">${esc(work.title)}</a>
      <span class="my-meta">${work.itemIds.length} ${formats[work.format].unit} · ${styleOf(work.format, work.style).name} · 来自专辑「${esc(album.name)}」 · ${ago(work.updatedAt)}更新</span>
      <span class="my-status">${isPublished(work.id) ? '<span class="status on">已发布到社区</span>' : '<span class="status">未发布</span>'}${count ? `<span class="status">${count} 条留言</span>` : ''}${fresh.length ? `<span class="status new">专辑有 ${fresh.length} 条新收藏</span>` : ''}</span>
    </div>
    <div class="my-actions"><a class="secondary small" href="#/w/${work.id}">打开</a><button class="primary small" data-action="share-work" data-id="${work.id}">分享</button></div>
  </article>`;
}

export function mineView() {
  const works = listWorks();
  const favorites = listFavorites().map(entry => decodeWork(entry.code)).filter(Boolean);
  const html = `<div class="page mine">${header('me')}<main id="main" class="mine-main">
    <div class="explore-head"><div><div class="kicker">MY PIECES · 我的作品</div><h1>收藏过的喜欢，<br/><em>在这里继续生长。</em></h1></div><p>每份作品都和原来的专辑连着。专辑里有了新收藏，可以一键放进作品，也可以保留这一版，当作某段时间的兴趣记录。</p></div>
    <section class="mine-section"><div class="mine-title"><h2>我做的</h2><a class="primary small" href="#/create">＋ 新建作品</a></div>
      ${works.length ? `<div class="my-list">${works.map(row).join('')}</div>` : `<div class="empty-card"><b>还没有作品</b><p>把一个专辑交给拾间，30 秒就能得到第一版。</p><a class="primary" href="#/create">从一个专辑开始 ↗</a></div>`}
    </section>
    <section class="mine-section"><div class="mine-title"><h2>收藏的作品</h2><a class="secondary small" href="#/explore">去社区灵感逛逛</a></div>
      ${favorites.length ? `<div class="masonry small">${favorites.map(work => workCard(work, { showLike: false, href: visitHref(work) })).join('')}</div>` : '<p class="muted">在别人的作品里点「♡ 收藏」，就会出现在这里。</p>'}
    </section>
    <div class="reset-row"><button class="link-button" data-action="reset">清空 Demo 数据（作品、留言、收藏）</button></div>
  </main>${footer()}</div>`;

  return {
    name: 'mine', title: '我的作品', html,
    mount() {
      onAction('share-work', button => { const work = getWork(button.dataset.id); if (work) openShare(work); });
      onAction('reset', () => {
        if (!confirm('确定清空本机上的 Demo 数据吗？')) return;
        resetDemo();
        toast('已清空');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });
    },
  };
}
