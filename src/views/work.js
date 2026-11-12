// 作品页：同一个外壳承载三种体验，区分“创作者视角”和“访客视角”。
// #/w/:id  创作者打开自己的作品（可编辑、分享）
// #/v/:code 任何人打开邀请链接（先看到邀请卡，再进入体验，可以留言、收藏、我也做一个）

import { albumById } from '../data/albums.js';
import { formats } from '../data/formats.js';
import { decodeWork, encodeWork, newItemsFor } from '../lib/generate.js';
import { comments, deleteWork, getWork, isFavorite, isMine, onExternalChange, toggleFavorite, updateWork } from '../lib/store.js';
import { $, esc, onAction, openModal, toast } from '../lib/ui.js';
import { bookHtml, mountBook } from './book.js';
import { brand, notFoundView } from './chrome.js';
import { openEditor } from './editor.js';
import { galleryHtml, mountGallery } from './gallery.js';
import { bindGuestbook, guestbookHtml, refreshGuestbooks } from './guestbook.js';
import { openItem } from './item.js';
import { inviteCard, openShare } from './share.js';
import { mountShop, shopHtml } from './shop.js';

const EXPERIENCES = { gallery: [galleryHtml, mountGallery], book: [bookHtml, mountBook], shop: [shopHtml, mountShop] };
const ENTER_LABEL = { gallery: '进入展厅', book: '翻开画册', shop: '走到店门口' };

export function workView({ id, code, query = {} }) {
  let work = code ? decodeWork(code) : getWork(id);
  if (!work) return notFoundView();
  const owner = !code && isMine(work.id);
  let mode = owner ? 'creator' : 'visitor';
  let previewing = false;

  const actions = () => {
    const count = comments(work.id).length;
    if (mode === 'creator') return `<button class="wb-btn" data-action="edit">编辑</button><button class="wb-btn" data-action="preview">访客视角</button><button class="wb-btn primary" data-action="share">分享 ↗</button>`;
    return `<button class="wb-btn ${isFavorite(work.id) ? 'on' : ''}" data-action="favorite">${isFavorite(work.id) ? '♥ 已收藏' : '♡ 收藏'}</button><button class="wb-btn" data-action="guestbook">留言 <span data-wb-count>${count}</span></button><button class="wb-btn" data-action="share">转发</button>${previewing ? '<button class="wb-btn primary" data-action="exit-preview">回到创作者视角</button>' : '<button class="wb-btn primary" data-action="remix">我也做一个 →</button>'}`;
  };
  const inviteCover = () => `<div class="invite-cover" data-invite data-format="${work.format}" data-style="${work.style}"><div class="invite-inner"><span class="mono">YOU ARE INVITED · 拾间</span>${inviteCard(work)}<p>${esc(work.intro)}</p><button class="primary" data-action="enter">${ENTER_LABEL[work.format]} →</button><span class="invite-foot mono">来自小红书专辑「${esc(albumById(work.albumId).name)}」· 用拾间制作</span></div></div>`;

  const html = `<div class="work-shell" data-format="${work.format}" data-mode="${mode}">
    <header class="work-bar">${brand()}<div class="wb-title"><span class="mono" data-wb-kind>${formats[work.format].name} · ${esc(work.creator)}</span><b data-wb-title>${esc(work.title)}</b></div><div class="wb-actions" data-wb-actions>${actions()}</div></header>
    <div class="preview-banner" data-preview-banner hidden>你正在以访客视角预览：朋友打开链接时看到的就是这样</div>
    <main class="work-stage" id="main" data-stage></main>
    ${mode === 'visitor' && query.enter !== '1' ? inviteCover() : ''}
  </div>`;

  function mount(root) {
    const shell = $('.work-shell', root);
    const stage = $('[data-stage]', root);
    let stageCleanup = null;
    let editor = null;

    const ctx = (startPos = 0) => ({
      mode, startPos,
      onChange: refreshCounts,
      openItem: (itemId, options = {}) => openItem(work, itemId, { mode, onChange: refreshCounts, ...options }),
    });

    // 重新渲染体验时，尽量保留用户当前看到的位置。
    function renderStage() {
      const formatBefore = shell.dataset.renderedFormat;
      const snapshot = formatBefore === work.format ? { left: $('.gx-track', stage)?.scrollLeft, scene: $('.sx', stage)?.dataset.scene, pos: Number($('[data-book]', stage)?.dataset.pos || 0) } : {};
      stageCleanup?.();
      const [toHtml, toMount] = EXPERIENCES[work.format];
      shell.dataset.format = shell.dataset.renderedFormat = work.format;
      stage.innerHTML = toHtml(work, { mode });
      stageCleanup = toMount(stage, work, ctx(snapshot.pos || 0));
      const track = $('.gx-track', stage);
      const shop = $('.sx', stage);
      if (snapshot.left && track) track.scrollLeft = snapshot.left;
      if (snapshot.scene && shop) shop.dataset.scene = snapshot.scene === 'opening' ? 'inside' : snapshot.scene;
    }
    function renderBar() {
      shell.dataset.mode = mode;
      $('[data-wb-actions]', root).innerHTML = actions();
      $('[data-wb-title]', root).textContent = work.title;
      $('[data-wb-kind]', root).textContent = `${formats[work.format].name} · ${work.creator}`;
    }
    // known：当前页面已经“知道”的留言数。本窗口自己留言时同步更新，只有别的窗口新增的才提示。
    let known = comments(work.id).length;
    function refreshCounts() {
      known = comments(work.id).length;
      const count = $('[data-wb-count]', root);
      if (count) count.textContent = known;
    }

    // ---------- 创作者 ----------
    onAction('edit', () => {
      if (mode !== 'creator') return;
      editor = openEditor(shell, () => work, {
        onChange(changes, { rerender }) {
          work = updateWork(work.id, changes);
          renderBar();
          if (rerender) renderStage();
        },
        onDelete() { deleteWork(work.id); toast('作品已删除'); location.hash = '#/me'; },
        onClose() { editor = null; shell.classList.remove('editing'); },
      });
      shell.classList.add('editing');
    });
    onAction('share', () => openShare(work));
    onAction('preview', () => {
      previewing = true; mode = 'visitor';
      editor?.close();
      renderBar(); renderStage();
      $('[data-preview-banner]', root).hidden = false;
      shell.insertAdjacentHTML('beforeend', inviteCover());
    });
    onAction('exit-preview', () => {
      previewing = false; mode = 'creator';
      $('[data-invite]', root)?.remove();
      $('[data-preview-banner]', root).hidden = true;
      renderBar(); renderStage();
    });

    // 专辑里有新收藏时，提示是否放进作品。
    const pending = owner && !query.fresh && !work.dismissedNew ? newItemsFor(work) : [];
    if (pending.length) {
      shell.insertAdjacentHTML('beforeend', `<div class="sync-banner" data-sync><span class="sync-dot"></span><div><b>专辑「${esc(albumById(work.albumId).name)}」里多了 ${pending.length} 条新收藏</b><span>${pending.map(item => `《${esc(item.title)}》`).join('')}——要放进这份作品吗？</span></div><button class="primary small" data-action="sync-add">放进作品</button><button class="secondary small" data-action="sync-keep">保留这一版</button></div>`);
    }
    onAction('sync-add', () => {
      work = updateWork(work.id, { itemIds: [...work.itemIds, ...pending.map(item => item.id)], knownIds: albumById(work.albumId).items.map(item => item.id) });
      $('[data-sync]', root)?.remove();
      renderStage();
      toast(`已加入 ${pending.length} 件新收藏`);
    });
    onAction('sync-keep', () => {
      work = updateWork(work.id, { dismissedNew: true, knownIds: albumById(work.albumId).items.map(item => item.id) });
      $('[data-sync]', root)?.remove();
      toast('好的，这一版会保持现在的样子，当作这段时间的收藏记录');
    });

    // 刚生成：给一句引导。
    if (owner && query.fresh) {
      shell.insertAdjacentHTML('beforeend', `<div class="coach" data-coach><span class="mono">✦ FIRST DRAFT</span><b>初稿做好了。</b><p>先逛一遍。想改名字、换封面、调顺序或换风格，点右上角「编辑」；满意了就「分享」。</p><div><button class="primary small" data-action="coach-ok">好的</button><button class="link-button" data-action="edit">现在就编辑</button></div></div>`);
    }
    onAction('coach-ok', () => $('[data-coach]', root)?.remove());

    // ---------- 访客 ----------
    onAction('enter', () => {
      const cover = $('[data-invite]', root);
      cover?.classList.add('leaving');
      setTimeout(() => cover?.remove(), 650);
      $('.gx-track', stage)?.focus({ preventScroll: true });
    });
    onAction('favorite', () => {
      if (previewing) { toast('这是预览，访客点这里会把作品收藏到自己的「我的作品」'); return; }
      const on = toggleFavorite(work.id, encodeWork(work));
      renderBar();
      toast(on ? '已收藏，可以在「我的作品 · 收藏的作品」里找到' : '已取消收藏');
    });
    onAction('guestbook', () => {
      const card = openModal(`<div class="gb-modal"><div class="kicker">GUESTBOOK</div><h2>给${esc(work.creator)}留句话</h2>${guestbookHtml(work, mode)}</div>`, { className: 'modal-narrow', label: '留言簿' });
      bindGuestbook(card, work, mode, () => { refreshGuestbooks(stage, work); refreshCounts(); });
    });
    onAction('remix', () => { location.hash = `#/create?album=${work.albumId}&format=${work.format}`; });

    // 另一个窗口里有人留言（比如作者在新窗口以访客身份打开了邀请链接）：实时刷新。
    const stopListening = onExternalChange(() => {
      const added = comments(work.id).length - known;
      refreshGuestbooks(stage, work);
      refreshCounts();
      if (added > 0 && mode === 'creator') toast(`收到 ${added} 条新留言`);
    });

    renderStage();
    if (owner && query.fresh) history.replaceState(null, '', `#/w/${work.id}`);
    return () => { stageCleanup?.(); stopListening(); };
  }

  return { name: 'work', title: work.title, html, mount };
}
