// 社区灵感：小红书式的双列/多列瀑布流，按形式筛选。

import { formats } from '../data/formats.js';
import { feed, isMine } from '../lib/store.js';
import { $, onAction } from '../lib/ui.js';
import { footer, header } from './chrome.js';
import { registerLikeAction, workCard } from './cards.js';

const FILTERS = [['all', '全部'], ['gallery', formats.gallery.name], ['book', formats.book.name], ['shop', formats.shop.name]];

export function exploreView(query = {}) {
  let filter = FILTERS.some(([key]) => key === query.f) ? query.f : 'all';
  const grid = () => {
    const list = feed().filter(work => filter === 'all' || work.format === filter);
    return list.map(work => (isMine(work.id) ? workCard(work, { href: `#/w/${work.id}` }).replace('<article class="work-card"', '<article class="work-card mine"') : workCard(work))).join('');
  };
  const html = `<div class="page explore">${header('explore')}<main id="main" class="explore-main">
    <div class="explore-head"><div><div class="kicker">COMMUNITY · 社区灵感</div><h1>别人的收藏夹，<br/><em>也可以去逛。</em></h1></div><p>这些作品都来自真实的收藏专辑。点进去就是访客视角：可以逛、可以留言，看到喜欢的形式，也可以用自己的专辑做一个。</p></div>
    <div class="filters" role="tablist">${FILTERS.map(([key, label]) => `<button class="chip ${filter === key ? 'on' : ''}" data-action="filter" data-f="${key}" role="tab" aria-selected="${filter === key}">${label}</button>`).join('')}</div>
    <div class="masonry" data-grid>${grid()}</div>
  </main>${footer()}</div>`;

  return {
    name: 'explore', title: '社区灵感', html,
    mount(root) {
      registerLikeAction();
      onAction('filter', button => {
        filter = button.dataset.f;
        root.querySelectorAll('[data-action="filter"]').forEach(chip => { chip.classList.toggle('on', chip.dataset.f === filter); chip.setAttribute('aria-selected', chip.dataset.f === filter); });
        $('[data-grid]', root).innerHTML = grid();
      });
    },
  };
}
