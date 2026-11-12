// 私人小展：横向漫步的展厅。序厅 → 分展厅陈列 → 出口留言簿。

import { itemById } from '../data/albums.js';
import { galleryRooms } from '../lib/generate.js';
import { comments } from '../lib/store.js';
import { $, $$, esc, onAction, pad } from '../lib/ui.js';
import { bindGuestbook, guestbookHtml } from './guestbook.js';

const ORDINAL = ['一', '二', '三', '四', '五', '六'];

export function galleryHtml(work, { mode }) {
  const items = work.itemIds.map(itemById).filter(Boolean);
  const rooms = galleryRooms(items);
  let index = 0;
  const minutes = Math.max(3, Math.round(items.length * 0.7));
  const roomsHtml = rooms.map((room, r) => `
    <section class="gx-room" data-stop data-room="${r}" data-label="第${ORDINAL[r] || r + 1}展厅 · ${esc(room.name)}"><span class="mono">ROOM ${pad(r + 1)}</span><h2>第${ORDINAL[r] || r + 1}展厅</h2><h3>${esc(room.name)}</h3><p>${esc(room.sub)}</p><span class="gx-room-count mono">${room.items.length} 件</span></section>
    ${room.items.map(item => {
      const i = index++;
      const count = comments(work.id, item.id).length;
      return `<figure class="gx-piece form-${item.form}" data-stop data-room="${r}" data-label="第${ORDINAL[r] || r + 1}展厅 · ${esc(room.name)}" data-title="${esc(item.title)}">
        <button class="gx-art" data-action="open-item" data-id="${item.id}" data-context="第${ORDINAL[r] || r + 1}展厅" aria-label="细看《${esc(item.title)}》"><span class="gx-mount"><img src="${item.image}" alt="${esc(item.title)}" style="aspect-ratio:${item.w}/${item.h}" draggable="false"/></span></button>
        <figcaption class="gx-label"><span class="mono">NO. ${pad(i + 1)}</span><b>${esc(item.title)}</b><span>${esc(item.artist)} · ${esc(item.era)}</span><span class="mono">${esc(item.medium)}</span><span class="gx-note">${esc(item.note)}</span><button class="gx-more" data-action="open-item" data-id="${item.id}" data-context="第${ORDINAL[r] || r + 1}展厅">细看${count ? ` · ${count} 条留言` : ''} →</button></figcaption>
      </figure>`;
    }).join('')}`).join('');

  return `<div class="gx" data-style="${work.style}">
    <div class="gx-track" tabindex="0" aria-label="展厅，可以左右滚动">
      <section class="gx-entrance" data-stop data-label="序厅">
        <div class="kicker">A LITTLE GALLERY · 策展人 ${esc(work.creator)}</div>
        <h1>${esc(work.title)}</h1>
        <p class="gx-intro">${esc(work.intro)}</p>
        ${work.idea ? `<blockquote class="gx-idea"><span class="mono">策展手记</span>“${esc(work.idea)}”</blockquote>` : ''}
        <div class="gx-facts mono">${items.length} 件作品 · ${rooms.length} 个展厅 · 约 ${minutes} 分钟</div>
        <button class="gx-start" data-action="gx-next">向右走，开始看展 →</button>
        <div class="gx-hint mono">滚动鼠标 · 方向键 · 点作品细看</div>
      </section>
      ${roomsHtml}
      <section class="gx-exit" data-stop data-label="出口">
        <div class="kicker">THE END · 谢谢你来看展</div>
        <h2>出口在这里，<br/>留言簿也在这里。</h2>
        ${guestbookHtml(work, mode, { title: '展厅留言簿', placeholder: mode === 'creator' ? '写一句给来看展的人…' : '看完了，想对策展人说…' })}
        <div class="exit-actions">${mode === 'creator'
          ? '<button class="secondary" data-action="edit">编辑这场展</button><button class="primary" data-action="share">分享给朋友 ↗</button>'
          : '<button class="secondary" data-action="favorite">♡ 收藏这场展</button><button class="primary" data-action="remix">我也办一场 →</button>'}</div>
      </section>
    </div>
    <div class="gx-floor" aria-hidden="true"></div>
    <div class="gx-hud">
      <div class="hud-now"><span class="mono" data-hud-room>序厅</span><b data-hud-title>${esc(work.title)}</b></div>
      <div class="hud-track" data-hud-track><i data-hud-fill></i></div>
      <div class="hud-ctrl"><button data-action="gx-prev" aria-label="上一件">←</button><button data-action="gx-next" aria-label="下一件">→</button></div>
    </div>
  </div>`;
}

export function mountGallery(root, work, { mode, openItem, onChange }) {
  const track = $('.gx-track', root);
  const stops = $$('[data-stop]', track);
  const center = el => el.offsetLeft + el.offsetWidth / 2;
  const current = () => {
    const mid = track.scrollLeft + track.clientWidth / 2;
    let best = 0;
    stops.forEach((stop, i) => { if (Math.abs(center(stop) - mid) < Math.abs(center(stops[best]) - mid)) best = i; });
    return best;
  };
  const goTo = i => {
    const stop = stops[Math.max(0, Math.min(stops.length - 1, i))];
    track.scrollTo({ left: center(stop) - track.clientWidth / 2, behavior: 'smooth' });
  };

  // 竖向滚轮转成横向行走。
  const onWheel = event => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    track.scrollLeft += event.deltaY;
  };
  track.addEventListener('wheel', onWheel, { passive: false });

  const onKey = event => {
    if (document.body.classList.contains('has-modal') || /INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); goTo(current() + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(current() - 1); }
  };
  window.addEventListener('keydown', onKey);

  // 拖动画面行走（鼠标）。
  let drag = null;
  track.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.target.closest('button, input, a, form')) return;
    drag = { x: event.clientX, left: track.scrollLeft, moved: false };
    track.classList.add('dragging');
  });
  const onMove = event => {
    if (!drag) return;
    const dx = event.clientX - drag.x;
    if (Math.abs(dx) > 4) drag.moved = true;
    track.scrollLeft = drag.left - dx;
  };
  // 拖动结束时会紧跟一次 click，标记一下，避免误打开作品。
  const onUp = () => {
    if (drag?.moved) { track.classList.add('was-dragged'); setTimeout(() => track.classList.remove('was-dragged'), 0); }
    drag = null;
    track.classList.remove('dragging');
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);

  // HUD：当前展厅、作品名、进度。
  const hudRoom = $('[data-hud-room]', root);
  const hudTitle = $('[data-hud-title]', root);
  const fill = $('[data-hud-fill]', root);
  let frame = 0;
  const update = () => {
    frame = 0;
    const i = current();
    const stop = stops[i];
    hudRoom.textContent = stop.dataset.label || '';
    hudTitle.textContent = stop.dataset.title || (i === 0 ? work.title : i === stops.length - 1 ? '谢谢你来看展' : stop.querySelector('h3')?.textContent || '');
    const max = track.scrollWidth - track.clientWidth;
    fill.style.width = `${max > 0 ? (track.scrollLeft / max) * 100 : 0}%`;
    stops.forEach((el, n) => el.classList.toggle('lit', n === i));
  };
  const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
  track.addEventListener('scroll', onScroll);
  update();

  $('[data-hud-track]', root).addEventListener('click', event => {
    const rect = event.currentTarget.getBoundingClientRect();
    track.scrollTo({ left: ((event.clientX - rect.left) / rect.width) * (track.scrollWidth - track.clientWidth), behavior: 'smooth' });
  });

  onAction('gx-next', () => goTo(current() + 1));
  onAction('gx-prev', () => goTo(current() - 1));
  onAction('open-item', button => { if (!track.classList.contains('was-dragged')) openItem(button.dataset.id, { context: button.dataset.context }); });
  bindGuestbook(root, work, mode, onChange);
  track.focus({ preventScroll: true });

  return () => {
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    cancelAnimationFrame(frame);
  };
}
