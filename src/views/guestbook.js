// 留言簿：留给整份作品的话。小展放在出口，画册放在最后一页，小店放在收银台。

import { addComment, comments } from '../lib/store.js';
import { $, toast } from '../lib/ui.js';
import { commenterName, commentList } from './item.js';

export function guestbookHtml(work, mode, { title = '留言簿', placeholder = '写一句给作者的话…' } = {}) {
  const list = comments(work.id, null);
  return `<div class="guestbook" data-guestbook><div class="guestbook-head"><b>${title}</b><span class="mono" data-gb-count>${list.length} 条</span></div><div class="guestbook-list" data-gb-list>${commentList(list.slice(-6).reverse(), mode === 'creator' ? '还没有访客留言。分享出去之后，留言会出现在这里。' : '还没有人留言，做第一个吧。')}</div><form class="comment-form" data-gb-form><input name="text" maxlength="140" placeholder="${placeholder}" aria-label="留言"/><button class="primary small" type="submit">留下</button></form></div>`;
}

export function bindGuestbook(root, work, mode, onChange) {
  root.querySelectorAll('[data-gb-form]').forEach(form => form.addEventListener('submit', event => {
    event.preventDefault();
    const field = form.elements.text;
    if (!field.value.trim()) { field.focus(); return; }
    addComment(work.id, { itemId: null, text: field.value, name: commenterName(mode) });
    field.value = '';
    refreshGuestbooks(root, work);
    toast(mode === 'creator' ? '已留言' : '留言已经送到作者那里了');
    onChange?.();
  }));
}

export function refreshGuestbooks(root, work) {
  const list = comments(work.id, null);
  root.querySelectorAll('[data-guestbook]').forEach(book => {
    $('[data-gb-count]', book).textContent = `${list.length} 条`;
    $('[data-gb-list]', book).innerHTML = commentList(list.slice(-6).reverse());
  });
}
