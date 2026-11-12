// 入口：基于 hash 的路由。每个页面返回 { title, html, mount }，mount 返回清理函数。

import { clearRouteActions, closeModal } from './lib/ui.js';
import { homeView } from './views/home.js';
import { studioView } from './views/studio.js';
import { workView } from './views/work.js';
import { exploreView } from './views/explore.js';
import { mineView } from './views/mine.js';
import { notFoundView } from './views/chrome.js';

const routes = [
  [/^\/?$/, () => homeView()],
  [/^\/create$/, (_, query) => studioView(query)],
  [/^\/w\/([\w-]+)$/, ([id], query) => workView({ id, query })],
  [/^\/v\/([\w-]+)$/, ([code], query) => workView({ code, query })],
  [/^\/explore$/, (_, query) => exploreView(query)],
  [/^\/me$/, () => mineView()],
];

const app = document.querySelector('#app');
let cleanup = null;

function parseHash() {
  const raw = decodeURIComponent(location.hash.replace(/^#/, '')) || '/';
  const [path, search = ''] = raw.split('?');
  return { path, query: Object.fromEntries(new URLSearchParams(search)) };
}

function render() {
  cleanup?.();
  cleanup = null;
  clearRouteActions();
  closeModal(true);
  const { path, query } = parseHash();
  let view = null;
  for (const [pattern, make] of routes) {
    const match = path.match(pattern);
    if (match) { view = make(match.slice(1), query); break; }
  }
  view ||= notFoundView();
  document.title = view.title ? `${view.title} · 拾间` : '拾间 SHIJIAN — 让收藏里的喜欢，重新发生';
  document.body.dataset.view = view.name || 'page';
  app.innerHTML = view.html;
  if (!query.keepScroll) window.scrollTo({ top: 0, behavior: 'instant' });
  cleanup = view.mount?.(app) || null;
}

window.addEventListener('hashchange', render);
render();
