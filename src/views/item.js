// 单件内容的“细看”弹窗：放大看细节、读导览词、回到原笔记、在这一件旁边留言。

import { itemById } from '../data/albums.js';
import { formats } from '../data/formats.js';
import { addComment, comments, profile } from '../lib/store.js';
import { $, esc, openModal, pad, toast } from '../lib/ui.js';

export function commentList(list, empty = '还没有人留言。') {
  if (!list.length) return `<p class="no-comments">${empty}</p>`;
  return `<ul class="comment-list">${list.map(comment => `<li><span class="mini-avatar">${esc(comment.name.slice(0, 1))}</span><div><b>${esc(comment.name)}</b><p>${esc(comment.text)}</p></div></li>`).join('')}</ul>`;
}

export const commenterName = mode => (mode === 'creator' ? `${profile().name}（作者）` : '一位访客');

export function openItem(work, itemId, { mode = 'visitor', focusComment = false, onChange, context = '' } = {}) {
  const item = itemById(itemId);
  if (!item) return;
  const index = work.itemIds.indexOf(itemId);
  const total = work.itemIds.length;
  const list = comments(work.id, itemId);
  const card = openModal(`<div class="item-view">
    <div class="item-stage" data-zoom><img src="${item.image}" alt="${esc(item.title)}" style="aspect-ratio:${item.w}/${item.h}"/><span class="zoom-hint mono">移动鼠标放大细看 · 点击锁定</span></div>
    <div class="item-info">
      <div class="kicker">NO. ${pad(index + 1)} / ${pad(total)}${context ? ` · ${esc(context)}` : ''}</div>
      <h2>${esc(item.title)}</h2>
      <div class="item-artist">${esc(item.artist)} · ${esc(item.era)}</div>
      <div class="item-medium mono">${esc(item.medium)} · ${esc(item.en)}</div>
      <p class="item-note">${esc(item.note)}</p>
      <div class="item-origin"><span>收藏于 ${esc(item.saved)} · 来自笔记《${esc(item.fromNote)}》</span><span class="origin-links"><button class="link-button" data-origin>查看原笔记</button><a href="${item.source}" target="_blank" rel="noreferrer">馆藏来源 ↗</a></span></div>
      <div class="item-comments"><h4>这件${work.format === 'shop' ? '小物' : '作品'}旁的留言 <span class="mono">${list.length}</span></h4><div data-comments>${commentList(list, '还没有人在这里留言，做第一个吧。')}</div>
        <form class="comment-form" data-comment-form><input name="text" maxlength="140" placeholder="${mode === 'creator' ? '写一句收藏它时的心情…' : '这件让你想起了什么？'}" aria-label="留言"/><button class="primary small" type="submit">留下</button></form></div>
      <div class="item-nav"><button class="secondary small" data-step="-1" ${index <= 0 ? 'disabled' : ''}>← 上一件</button><span class="mono">${esc(formats[work.format].name)}</span><button class="secondary small" data-step="1" ${index >= total - 1 ? 'disabled' : ''}>下一件 →</button></div>
    </div>
  </div>`, { className: 'modal-item', label: item.title });

  // 放大镜：鼠标位置决定放大中心，点击锁定/解锁。
  const stage = $('[data-zoom]', card);
  const image = $('img', stage);
  let locked = false;
  const aim = event => {
    const rect = stage.getBoundingClientRect();
    image.style.transformOrigin = `${((event.clientX - rect.left) / rect.width) * 100}% ${((event.clientY - rect.top) / rect.height) * 100}%`;
  };
  stage.addEventListener('pointermove', event => { if (!locked) { aim(event); stage.classList.add('zooming'); } });
  stage.addEventListener('pointerleave', () => { if (!locked) stage.classList.remove('zooming'); });
  stage.addEventListener('click', event => { locked = !locked; aim(event); stage.classList.toggle('zooming', locked); stage.classList.toggle('locked', locked); });

  $('[data-origin]', card).addEventListener('click', () => toast(`Demo：上线后会跳转到小红书原笔记《${item.fromNote}》`));
  card.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => {
    const next = work.itemIds[index + Number(button.dataset.step)];
    if (next) openItem(work, next, { mode, onChange, context });
  }));
  $('[data-comment-form]', card).addEventListener('submit', event => {
    event.preventDefault();
    const field = event.target.elements.text;
    if (!field.value.trim()) { field.focus(); return; }
    addComment(work.id, { itemId, text: field.value, name: commenterName(mode) });
    field.value = '';
    const updated = comments(work.id, itemId);
    $('[data-comments]', card).innerHTML = commentList(updated);
    $('.item-comments h4 .mono', card).textContent = updated.length;
    toast('留言已经贴在这件旁边了');
    onChange?.();
  });
  if (focusComment) setTimeout(() => $('[data-comment-form] input', card)?.focus(), 80);
}
