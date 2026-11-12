// 页面外框：顶栏、页脚、素材来源说明、404。

import { albums } from '../data/albums.js';
import { profile } from '../lib/store.js';
import { esc, onAction, openModal } from '../lib/ui.js';

export function brand(extra = '') {
  return `<a class="brand ${extra}" href="#/" aria-label="拾间首页"><img src="assets/mark.svg" alt="" width="30" height="30"/><span>拾间</span><small>SHIJIAN</small></a>`;
}

export function header(active = '') {
  const link = (href, key, label) => `<a class="nav-link ${active === key ? 'active' : ''}" href="${href}">${label}</a>`;
  const me = profile();
  return `<header class="topbar">${brand()}<nav class="top-nav" aria-label="主导航">${link('#/create', 'create', '开始创造')}${link('#/explore', 'explore', '社区灵感')}${link('#/me', 'me', '我的作品')}<a class="avatar" href="#/me" title="${esc(me.name)}">${esc(me.avatar)}</a></nav></header>`;
}

export function footer() {
  onAction('sources', openSources, { global: true });
  return `<footer class="footer"><div><strong>拾间 / SHIJIAN</strong><span>把小红书收藏，变成可以走进去、翻开来、分享出去的作品 · 产品原型 Demo</span></div><div class="footer-notes"><span>本 Demo 未接入小红书真实数据，链接会匹配到样例专辑</span><button class="link-button" data-action="sources">图片来源 · 大都会艺术博物馆开放版权藏品（CC0）</button></div></footer>`;
}

export function openSources() {
  const rows = albums.map(album => `<h3>专辑「${esc(album.name)}」</h3><ul>${album.items.map(item => `<li><span>${esc(item.title)}</span><span class="mono">${esc(item.en)}</span><a href="${item.source}" target="_blank" rel="noreferrer">馆藏页 ↗</a></li>`).join('')}</ul>`).join('');
  openModal(`<div class="sources"><div class="kicker">CREDITS</div><h2>图片来源</h2><p>Demo 中的作品图片均来自大都会艺术博物馆开放获取计划（Open Access），以 CC0 公有领域协议发布。中文作品名为意译，以馆方英文名为准；导览词与“原笔记”标题为 Demo 虚构内容。</p>${rows}</div>`, { className: 'modal-wide', label: '图片来源' });
}

export function notFoundView() {
  return {
    name: 'page', title: '没有找到',
    html: `<div class="page">${header()}<main class="empty-state" id="main"><div class="kicker">404</div><h1>这个作品走丢了</h1><p>链接可能不完整，或者作品已经被创作者删除。</p><a class="primary" href="#/">回到首页</a></main></div>`,
  };
}
