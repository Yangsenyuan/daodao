// 分享：发给朋友（邀请卡 + 链接），或发成一篇小红书笔记回到社区。

import { albumById, itemById } from '../data/albums.js';
import { formats } from '../data/formats.js';
import { inviteUrl } from '../lib/generate.js';
import { isMine, isPublished, publish } from '../lib/store.js';
import { $, $$, copyText, esc, openModal, toast } from '../lib/ui.js';

const INVITE_LINE = {
  gallery: by => `${by} 邀请你来看展`,
  book: by => `${by} 把一本画册放在了你桌上`,
  shop: by => `${by} 的小店开张了，邀请你来逛`,
};

export function inviteCard(work) {
  const cover = itemById(work.coverId) || itemById(work.itemIds[0]);
  const format = formats[work.format];
  const date = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
  return `<div class="invite-card ic-${work.format}" data-style="${work.style}">
    <div class="ic-art"><img src="${cover.image}" alt=""/></div>
    <div class="ic-body"><span class="mono">${format.en.toUpperCase()} · 拾间</span><b>${esc(work.title)}</b><span class="ic-line">${esc(INVITE_LINE[work.format](work.creator))}</span><span class="ic-meta mono">${work.itemIds.length} ${format.unit} · ${date}</span></div>
    ${work.format === 'gallery' ? `<div class="ic-stub"><span class="mono">ADMIT ONE</span><b>入场券</b><span class="mono">NO. ${String(Math.abs(hash(work.id)) % 9000 + 1000)}</span></div>` : ''}
  </div>`;
}
function hash(text) { let h = 0; for (const char of text) h = (h * 31 + char.charCodeAt(0)) | 0; return h; }

function noteCopy(work) {
  const album = albumById(work.albumId);
  const format = formats[work.format];
  const made = { gallery: '办成了一场', book: '装订成了一本', shop: '开成了一家' }[work.format];
  const tags = ['拾间', format.name, '收藏夹活用', ...album.tags.slice(0, 2)];
  return { title: `把收藏夹${made}${format.name}｜${work.title}`, body: `把收藏夹里的 ${work.itemIds.length} 件「${album.name}」，${made}${format.name}。\n\n${work.intro}\n\n👉 点开下面的卡片，就能${format.verb}。看到喜欢的，可以在旁边留一句话。`, tags };
}

function noteMock(work) {
  const cover = itemById(work.coverId) || itemById(work.itemIds[0]);
  const others = work.itemIds.filter(id => id !== cover.id).slice(0, 2).map(itemById);
  const copy = noteCopy(work);
  return `<div class="phone"><div class="phone-bar mono"><span>9:41</span><span>●●● ▮</span></div>
    <div class="note-author"><span class="mini-avatar">${esc(work.avatar)}</span><b>${esc(work.creator)}</b><span class="follow">关注</span></div>
    <div class="note-cover" data-format="${work.format}"><img class="nc-main" src="${cover.image}" alt=""/>${others.map((item, i) => `<img class="nc-side s${i}" src="${item.image}" alt=""/>`).join('')}<div class="nc-band"><span class="mono">拾间 · ${formats[work.format].name}</span><b>${esc(work.title)}</b></div><span class="nc-enter">点击进入 →</span></div>
    <div class="note-text"><b>${esc(copy.title)}</b><p>${esc(copy.body).replace(/\n/g, '<br/>')}</p><p class="note-tags">${copy.tags.map(tag => `#${esc(tag)}`).join(' ')}</p>
    <div class="note-embed"><img src="assets/mark.svg" alt=""/><span><b>${esc(work.title)}</b><small>拾间作品 · ${formats[work.format].verb}</small></span><span class="go">进入</span></div></div>
    <div class="note-actions"><span class="say">说点什么…</span><span>♡</span><span>☆</span><span>💬</span></div></div>`;
}

export function openShare(work, { tab = 'friend' } = {}) {
  const mine = isMine(work.id);
  const url = inviteUrl(work);
  const card = openModal(`<div class="share">
    <div class="share-head"><div class="kicker">SHARE · ${mine ? '分享你的作品' : '转发给朋友'}</div><h2>${mine ? '把这份喜欢，<br/>发给一个人。' : '觉得朋友也会喜欢？'}</h2></div>
    ${mine ? `<div class="tabs" role="tablist"><button role="tab" data-tab="friend">发给朋友</button><button role="tab" data-tab="note">发到小红书</button></div>` : ''}
    <div class="tab-panel" data-panel="friend">
      <div class="friend-grid">${inviteCard(work)}<div class="friend-side"><p>朋友打开链接，会先看到这张邀请卡，再进入${formats[work.format].name}。不需要下载，也不需要登录。</p><div class="link-box"><input readonly value="${esc(url)}" aria-label="邀请链接"/><button class="primary small" data-copy>复制链接</button></div><a class="secondary small" href="${esc(url)}" target="_blank" rel="noopener">在新窗口以访客身份打开 ↗</a><p class="fine mono">内容编码在链接里 · 访客留言会回到作者这里（Demo 中保存在本机浏览器）</p></div></div>
    </div>
    ${mine ? `<div class="tab-panel" data-panel="note">
      <div class="note-grid">${noteMock(work)}<div class="note-side"><p>发成一篇笔记，作品会作为卡片嵌在笔记里。刷到它的人，点一下就能直接进来。</p><ul class="note-points"><li>封面由作品自动排版，标题叠在上面</li><li>正文和话题已经写好，可以复制后再改</li><li>发布后，作品也会出现在「社区灵感」里</li></ul><button class="secondary small" data-copy-note>复制笔记正文</button><button class="primary xhs" data-publish ${isPublished(work.id) ? 'disabled' : ''}>${isPublished(work.id) ? '已发布到社区' : '发布笔记（Demo）'}</button><a class="link-button" href="#/explore">去社区灵感看看 →</a></div></div>
    </div>` : ''}
  </div>`, { className: 'modal-share', label: '分享' });

  const show = name => {
    $$('[data-tab]', card).forEach(button => button.setAttribute('aria-selected', button.dataset.tab === name));
    $$('[data-panel]', card).forEach(panel => { panel.hidden = panel.dataset.panel !== name; });
  };
  $$('[data-tab]', card).forEach(button => button.addEventListener('click', () => show(button.dataset.tab)));
  show(mine ? tab : 'friend');

  $('[data-copy]', card).addEventListener('click', async () => { await copyText(url); toast('邀请链接已复制，发给朋友吧'); });
  $('[data-copy-note]', card)?.addEventListener('click', async () => { const copy = noteCopy(work); await copyText(`${copy.title}\n\n${copy.body}\n\n${copy.tags.map(tag => `#${tag}`).join(' ')}\n${url}`); toast('笔记正文已复制'); });
  $('[data-publish]', card)?.addEventListener('click', event => {
    publish(work.id);
    event.currentTarget.disabled = true;
    event.currentTarget.textContent = '已发布到社区';
    toast('发布成功！作品已经出现在「社区灵感」里');
  });
}
