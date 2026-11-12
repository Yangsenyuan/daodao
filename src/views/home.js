// 首页：讲清楚“收藏 → 作品 → 分享”，并用同一个专辑的三种形状直观展示。

import { albumById, itemById } from '../data/albums.js';
import { communityWorks } from '../data/community.js';
import { formatList, formats } from '../data/formats.js';
import { feed } from '../lib/store.js';
import { esc, onAction } from '../lib/ui.js';
import { footer, header } from './chrome.js';
import { registerLikeAction, visitHref, workCard } from './cards.js';
import { miniPreview } from './previews.js';

export function homeView() {
  const album = albumById('zihua');
  const albumItems = album.items.filter(item => !item.isNew);
  const sameAlbum = ['c-night', 'c-journal', 'c-fan'].map(id => communityWorks.find(work => work.id === id));
  const samples = { gallery: albumItems.slice(0, 3), book: albumById('vangogh').items, shop: albumById('qiwu').items };
  const sampleTitle = { gallery: '方寸之间', book: '他的 1887—1890', shop: '不卖无聊的小东西' };
  const sampleStyle = { gallery: 'teahouse', book: 'magazine', shop: 'grocery' };

  const html = `<div class="page home">${header('home')}<main id="main">
    <section class="hero">
      <div class="hero-copy">
        <div class="kicker">A NEW LIFE FOR YOUR SAVED THINGS</div>
        <h1><span>让收藏里的喜欢，</span><em>重新发生。</em></h1>
        <p class="lede">你在小红书收藏了很多，却很少再打开。拾间把一个专辑变成一场可以走进去的小展、一本可以翻的画册、一家可以逛的小店——自己重温，也邀请别人来。</p>
        <div class="hero-actions"><a class="primary" href="#/create">从一个专辑开始 <span aria-hidden="true">↗</span></a><button class="secondary" data-action="scroll-to" data-target="same-album">看看它能变成什么</button></div>
        <div class="hero-note mono">贴入笔记或专辑链接 · 30 秒生成初稿 · 可直接分享</div>
      </div>
      <div class="hero-stage" aria-hidden="true">
        <div class="stage-album">
          <div class="album-grid">${albumItems.slice(0, 4).map(item => `<img src="${item.image}" alt=""/>`).join('')}</div>
          <div class="album-name"><b>${esc(album.name)}</b><span>${album.items.length} 篇笔记 · 我的专辑</span></div>
        </div>
        <svg class="stage-lines" viewBox="0 0 400 400" preserveAspectRatio="none"><path d="M40 200 C 160 200, 200 70, 330 70"/><path d="M40 200 C 160 200, 200 200, 330 200"/><path d="M40 200 C 160 200, 200 330, 330 330"/></svg>
        ${sameAlbum.map((work, index) => `<a class="stage-work s${index + 1}" href="${visitHref(work)}" tabindex="-1">${miniPreview(work.format, work.style, work.itemIds.map(itemById), work.title)}<span class="stage-tag">${formats[work.format].name}</span></a>`).join('')}
      </div>
    </section>

    <section class="section steps" aria-labelledby="steps-title">
      <div class="section-head"><div><div class="kicker">HOW IT WORKS · 01</div><h2 id="steps-title">你只需要做<br/>三件事。</h2></div><p>剩下的编排、排版、布置，交给拾间。生成之后你随时可以改，也可以什么都不改，直接发出去。</p></div>
      <ol class="step-list">
        <li><span class="step-no">01</span><h3>贴一个链接</h3><p>一条笔记，或者整个专辑。拾间读出里面有什么：是字画、照片，还是一堆可爱的小东西。</p></li>
        <li><span class="step-no">02</span><h3>选一个形状</h3><p>根据内容推荐最合适的形式和风格，并说明理由。也可以凭感觉换，再补一句你的想法。</p></li>
        <li><span class="step-no">03</span><h3>发给一个人</h3><p>生成邀请链接发给朋友，或发成一篇笔记回到社区，让同样喜欢的人走进来，在作品旁留一句话。</p></li>
      </ol>
    </section>

    <section class="section" id="formats" aria-labelledby="formats-title">
      <div class="section-head"><div><div class="kicker">THE FORMATS · 02</div><h2 id="formats-title">喜欢不止<br/>一种形状。</h2></div><p>内容帮我们推荐，你决定它这次变成什么。每种形式都有自己的编排方式和互动。</p></div>
      <div class="format-grid">${formatList.map(format => format.soon
        ? `<div class="format-card soon">${miniPreview('concert')}<div class="format-body"><div class="format-top"><h3>${format.name}</h3><span class="soon-chip">即将推出</span></div><p>${format.line}</p><span class="fit">适合：${format.fit}</span></div></div>`
        : `<a class="format-card" href="#/create?format=${format.key}">${miniPreview(format.key, sampleStyle[format.key], samples[format.key], sampleTitle[format.key])}<div class="format-body"><div class="format-top"><h3>${format.name}</h3><span class="mono">${format.en}</span></div><p>${format.line}</p><span class="fit">适合：${format.fit}</span></div></a>`).join('')}</div>
    </section>

    <section class="section same-album" id="same-album" aria-labelledby="same-title">
      <div class="section-head"><div><div class="kicker">ONE ALBUM, THREE SHAPES · 03</div><h2 id="same-title">同一个「字画」专辑，<br/>三个人做出了三种样子。</h2></div><p>有人把灯关掉办了一场夜里的展，有人贴进了手账，有人开了一家扇面小铺。点进去，以访客的身份逛一逛。</p></div>
      <div class="same-grid">${sameAlbum.map(work => `<a class="same-card" href="${visitHref(work)}"><div class="same-visual">${miniPreview(work.format, work.style, work.itemIds.map(itemById), work.title)}</div><div class="same-info"><span class="format-chip static">${formats[work.format].name}</span><h3>${esc(work.title)}</h3><p>${esc(work.intro)}</p><span class="same-by"><span class="mini-avatar">${esc(work.avatar)}</span>${esc(work.creator)} · 进去看看 →</span></div></a>`).join('')}</div>
    </section>

    <section class="section" aria-labelledby="feed-title">
      <div class="section-head"><div><div class="kicker">FROM THE COMMUNITY · 04</div><h2 id="feed-title">别人的收藏夹，<br/>也可以去逛。</h2></div><a class="secondary" href="#/explore">去社区灵感 →</a></div>
      <div class="feed-row">${feed().slice(0, 4).map(work => workCard(work)).join('')}</div>
    </section>

    <section class="closing"><div class="kicker">YOUR TURN</div><h2>你的收藏夹里，<br/>躺着哪一场展？</h2><a class="primary" href="#/create">把一个专辑交给拾间 <span aria-hidden="true">↗</span></a></section>
  </main>${footer()}</div>`;

  return {
    name: 'home', html,
    mount() {
      registerLikeAction();
      onAction('scroll-to', button => document.getElementById(button.dataset.target)?.scrollIntoView({ behavior: 'smooth' }));
    },
  };
}
