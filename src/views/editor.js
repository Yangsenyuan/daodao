// 创作者的编辑抽屉：所有修改实时作用到作品上，左边的体验同步刷新。

import { albumById, itemById } from '../data/albums.js';
import { formatList, formats } from '../data/formats.js';
import { arrange, readIdea, recommendedStyle, styleFromIdea, titleOptions, writeIntro } from '../lib/generate.js';
import { $, esc, toast } from '../lib/ui.js';

export function openEditor(host, getWork, { onChange, onDelete, onClose }) {
  host.querySelector('.editor')?.remove();
  const panel = document.createElement('aside');
  panel.className = 'editor';
  panel.setAttribute('aria-label', '编辑作品');
  host.append(panel);

  const draw = () => {
    const work = getWork();
    const album = albumById(work.albumId);
    const outside = album.items.filter(item => !work.itemIds.includes(item.id));
    const format = formats[work.format];
    panel.innerHTML = `<div class="editor-head"><div><span class="mono">EDIT · 改动会自动保存</span><h2>编辑作品</h2></div><button class="modal-close" data-ed="close" aria-label="关闭编辑">×</button></div>
      <div class="editor-body">
        <div class="ed-field"><span>形式 <small>同一份收藏，换个形状</small></span><div class="seg">${formatList.filter(f => !f.soon).map(f => `<button data-ed="format" data-value="${f.key}" class="${f.key === work.format ? 'on' : ''}">${f.name}</button>`).join('')}</div></div>
        <div class="ed-field"><span>风格</span><div class="seg">${format.styles.map(style => `<button data-ed="style" data-value="${style.id}" class="${style.id === work.style ? 'on' : ''}">${style.name}</button>`).join('')}</div></div>
        <div class="ed-field"><span>标题</span><input data-ed-input="title" aria-label="标题" maxlength="24" value="${esc(work.title)}"/><div class="chips">${titleOptions(work.albumId, work.format, work.idea).filter(t => t !== work.title).slice(0, 3).map(t => `<button class="chip" data-ed="title-pick" data-value="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>
        <div class="ed-field"><span>开场白 <button class="link-button" data-ed="intro-regen">重新写一版</button></span><textarea data-ed-input="intro" aria-label="开场白" rows="4" maxlength="160">${esc(work.intro)}</textarea></div>
        <div class="ed-field"><span>封面</span><div class="cover-pick">${work.itemIds.map(id => { const item = itemById(id); return `<button data-ed="cover" data-value="${id}" class="${id === work.coverId ? 'on' : ''}" title="${esc(item.title)}"><img src="${item.image}" alt="${esc(item.title)}"/></button>`; }).join('')}</div></div>
        <div class="ed-field"><span>内容与顺序 <small>${work.itemIds.length} 件 · <button class="link-button" data-ed="auto-order">按${format.name}的规则重排</button></small></span><ol class="order-list">${work.itemIds.map((id, i) => { const item = itemById(id); return `<li><img src="${item.image}" alt=""/><span><b>${esc(item.title)}</b><small>${esc(item.artist)}</small></span><span class="order-btns"><button data-ed="up" data-value="${i}" ${i === 0 ? 'disabled' : ''} aria-label="上移">↑</button><button data-ed="down" data-value="${i}" ${i === work.itemIds.length - 1 ? 'disabled' : ''} aria-label="下移">↓</button><button data-ed="remove" data-value="${id}" aria-label="移出作品">×</button></span></li>`; }).join('')}</ol>
          ${outside.length ? `<div class="outside"><small>专辑里没放进来的</small>${outside.map(item => `<button class="outside-item" data-ed="add" data-value="${item.id}"><img src="${item.image}" alt=""/><span>${esc(item.title)}${item.isNew ? ' <em>新收藏</em>' : ''}</span><b>＋</b></button>`).join('')}</div>` : ''}</div>
      </div>
      <div class="editor-foot"><button class="link-button danger" data-ed="delete">删除这份作品</button><button class="primary small" data-ed="close">完成</button></div>`;
  };

  const patch = (changes, { redraw = true, rerender = true } = {}) => {
    onChange(changes, { rerender });
    if (redraw) { const y = $('.editor-body', panel)?.scrollTop || 0; draw(); $('.editor-body', panel).scrollTop = y; }
  };

  panel.addEventListener('click', event => {
    const button = event.target.closest('[data-ed]');
    if (!button || button.disabled) return;
    event.preventDefault();
    const work = getWork();
    const value = button.dataset.value;
    const ids = [...work.itemIds];
    switch (button.dataset.ed) {
      case 'close': close(); break;
      case 'format':
        if (value !== work.format) {
          // 换形式时，风格优先沿用“一句想法”里的暗示（如“深夜”），否则用该形式的推荐风格。
          patch({ format: value, style: styleFromIdea(value, readIdea(work.idea).style) || recommendedStyle(albumById(work.albumId), value) });
          toast(`换成了${formats[value].name}`);
        }
        break;
      case 'style': patch({ style: value }); break;
      case 'title-pick': patch({ title: value }); break;
      case 'intro-regen': patch({ intro: writeIntro(work.albumId, work.format, work.idea) }); toast('开场白按当前形式重写了一版'); break;
      case 'cover': patch({ coverId: value }); break;
      case 'auto-order': patch({ itemIds: arrange(ids, work.format) }); break;
      case 'up': case 'down': {
        const i = Number(value); const j = button.dataset.ed === 'up' ? i - 1 : i + 1;
        [ids[i], ids[j]] = [ids[j], ids[i]];
        patch({ itemIds: ids });
        break;
      }
      case 'remove':
        if (ids.length <= 1) { toast('至少留下一件'); break; }
        patch({ itemIds: ids.filter(id => id !== value), coverId: work.coverId === value ? ids.find(id => id !== value) : work.coverId });
        break;
      case 'add': patch({ itemIds: [...ids, value] }); break;
      case 'delete':
        if (confirm('删除后，已经发出去的邀请链接仍然可以打开（内容保存在链接里），但这份作品会从“我的作品”里移除。确定删除吗？')) onDelete();
        break;
      default: break;
    }
  });

  // 文字输入：边输入边保存，只刷新体验，不重绘抽屉（避免打断输入）。
  let typing;
  panel.addEventListener('input', event => {
    const field = event.target.dataset.edInput;
    if (!field) return;
    clearTimeout(typing);
    const value = event.target.value;
    typing = setTimeout(() => patch({ [field]: value.trim() || (field === 'title' ? '未命名作品' : '') }, { redraw: false }), 350);
  });

  function close() { panel.classList.remove('open'); setTimeout(() => panel.remove(), 300); onClose?.(); }
  draw();
  requestAnimationFrame(() => panel.classList.add('open'));
  return { close, redraw: draw };
}
