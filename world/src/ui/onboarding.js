// 新岛主引导：① 起个称呼（点切换按钮随机换一个）② 你好，XX —— 授权专辑上岛 → 交回给小岛开始建岛
import { mount, esc } from './overlay.js';
import { randomName } from '../core/profile.js';
import { daodaoSvg } from '../core/mascot.js';

const WORLD = { 博物馆: '博物馆', 日记本: '日记本', 房间: '小屋', 小街: '小街', 舞台: '舞台' };
const SHUFFLE = `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 7h3.5c2.2 0 3.6 1 4.8 2.8l1.4 2.4c1.2 1.8 2.6 2.8 4.8 2.8H21"/><path d="M18 12l3 3-3 3"/>
  <path d="M3 17h3.5c1.3 0 2.3-.4 3.1-1.1"/><path d="M14.4 8.1c.8-.7 1.8-1.1 3.1-1.1H21"/><path d="M18 4l3 3-3 3"/></svg>`;

export function onboarding({ albums, onStep }) {
  return new Promise(resolve => {
    const picked = new Set(albums.map(a => a.id));
    let name = randomName();
    const el = mount(`<div class="onb" role="dialog" aria-label="创建你的岛岛">
      <div class="onb-card">
        <div class="onb-steps"><i class="on"></i><i></i></div>
        <section data-step="1">
          <div class="onb-hello">${daodaoSvg(54)}<div><small>你好，我是</small><b class="display">岛岛</b></div></div>
          <h2>怎么称呼你？</h2>
          <p class="onb-sub">朋友来你的岛上玩时，会看到这个名字。没想好就点右边换一个。</p>
          <div class="onb-name">
            <input maxlength="14" aria-label="你的称呼" value="${esc(name)}">
            <button class="shuffle" aria-label="换一个昵称" title="换一个昵称">${SHUFFLE}</button>
          </div>
          <div class="onb-preview"><small>你的岛叫</small><b></b></div>
          <div class="onb-cta"><button class="pill red onb-main" data-next>下一步 →</button></div>
        </section>
        <section data-step="2" hidden>
          <div class="onb-hello">${daodaoSvg(54)}<div><b class="hi"></b><small>点点兴趣，<span class="display">岛岛</span>收藏~</small></div></div>
          <h2>把你的专辑，捏成一座岛</h2>
          <p class="onb-sub">选好要上岛的专辑。每个专辑会变成岛上的一个地方：看展的变博物馆，成长的变日记本……</p>
          <ul class="onb-albums">${albums.map(a => `
            <li><label>
              <img src="${a.cover.src}" alt="">
              <span class="t"><b>${esc(a.album)}</b><small>${a.count} 篇收藏 → ${esc(WORLD[a.kind] || a.kind)}</small></span>
              <input type="checkbox" data-id="${a.id}" checked><i class="sw"></i>
            </label></li>`).join('')}
          </ul>
          <div class="onb-row"><button class="pill ghost" data-back>上一步</button><button class="pill red onb-main" data-go></button></div>
        </section>
      </div></div>`);

    const s1 = el.querySelector('[data-step="1"]'), s2 = el.querySelector('[data-step="2"]');
    const dots = el.querySelectorAll('.onb-steps i');
    const goBtn = el.querySelector('[data-go]'), input = el.querySelector('.onb-name input');
    const preview = el.querySelector('.onb-preview b'), hi = el.querySelector('.hi');
    const current = () => (input.value.trim() || name).slice(0, 14);
    const refresh = () => {
      preview.textContent = `${current()}的岛岛`;
      hi.textContent = `你好，${current()}`;
      goBtn.textContent = picked.size ? `授权 ${picked.size} 个专辑，开始建岛 →` : '至少选一个专辑';
      goBtn.disabled = !picked.size;
    };
    el.querySelectorAll('input[type=checkbox]').forEach(cb => cb.addEventListener('change', () => { cb.checked ? picked.add(cb.dataset.id) : picked.delete(cb.dataset.id); refresh(); }));
    const go = step => {
      s1.hidden = step !== 1; s2.hidden = step !== 2;
      dots.forEach((d, i) => d.classList.toggle('on', i < step));
      el.querySelector('.onb-card').scrollTop = 0;
      onStep?.(step, current());
    };
    el.querySelector('[data-next]').onclick = () => go(2);
    el.querySelector('[data-back]').onclick = () => go(1);
    input.addEventListener('input', refresh);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') go(2); });

    // 切换按钮：转一圈，逐字敲出新昵称
    const shuffle = el.querySelector('.shuffle');
    let typing, turns = 0;
    shuffle.onclick = () => {
      turns += 1; shuffle.style.setProperty('--turn', `${turns * 360}deg`);
      clearInterval(typing);
      name = randomName(input.value);
      let i = 0; input.value = '';
      typing = setInterval(() => { input.value = name.slice(0, ++i); refresh(); if (i >= name.length) clearInterval(typing); }, 40);
    };

    goBtn.onclick = () => {
      if (!picked.size) return;
      el.classList.add('out');
      setTimeout(() => el.remove(), 450);
      resolve({ name: current(), albums: albums.filter(a => picked.has(a.id)).map(a => a.id) });
    };
    refresh();
    requestAnimationFrame(() => el.classList.add('in'));
  });
}
