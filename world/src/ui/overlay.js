// 2D 界面层：顶栏、提示、详情面板、分享票根、访客欢迎卡、toast
const root = () => document.getElementById('ui');
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
export function mount(html) { const e = h(html); root().appendChild(e); return e; }
export const fmt = n => n >= 10000 ? `${(n / 10000).toFixed(n >= 100000 ? 0 : 1)}万` : String(n);

let toastEl, toastTimer;
export function toast(msg, sub = '') {
  if (!toastEl || !toastEl.isConnected) toastEl = mount('<div class="toast"></div>');
  toastEl.innerHTML = `${esc(msg)}${sub ? `<small>${esc(sub)}</small>` : ''}`;
  requestAnimationFrame(() => toastEl.classList.add('on'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('on'), 2600);
}

let bannerEl, bannerTimer;
export function banner(title, sub = '') {
  if (!bannerEl || !bannerEl.isConnected) bannerEl = mount('<div class="hall-banner"></div>');
  bannerEl.innerHTML = `<b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}`;
  bannerEl.classList.remove('on'); void bannerEl.offsetWidth; bannerEl.classList.add('on');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => bannerEl.classList.remove('on'), 2400);
}

export function hint(text) {
  const el = mount(`<div class="hint">${esc(text)}</div>`);
  const hide = () => el.classList.add('hide');
  setTimeout(hide, 9000);
  return { el, hide };
}

// 详情面板：桌面在右侧，手机在底部
export function sheet() {
  const el = mount(`<aside class="sheet" aria-hidden="true"><div class="grab"></div><button class="close" aria-label="关闭">✕</button><div class="scroll"></div><div class="actions"></div></aside>`);
  const api = {
    el, isOpen: false, onClose: null,
    open(body, actions = '') {
      el.querySelector('.scroll').innerHTML = body;
      el.querySelector('.scroll').scrollTop = 0;
      el.querySelector('.actions').innerHTML = actions;
      el.querySelector('.actions').style.display = actions ? '' : 'none';
      el.classList.add('open'); el.setAttribute('aria-hidden', 'false'); api.isOpen = true;
      return el;
    },
    close() { if (!api.isOpen) return; el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); api.isOpen = false; api.onClose?.(); },
  };
  el.querySelector('.close').onclick = () => api.close();
  // 手机上往下拖关闭
  let sy = null;
  el.addEventListener('touchstart', e => { if (el.querySelector('.scroll').scrollTop <= 0) sy = e.touches[0].clientY; }, { passive: true });
  el.addEventListener('touchmove', e => { if (sy !== null && e.touches[0].clientY - sy > 70) { sy = null; api.close(); } }, { passive: true });
  el.addEventListener('touchend', () => { sy = null; }, { passive: true });
  el.addEventListener('click', e => {
    const more = e.target.closest('[data-more]');
    if (more) { more.previousElementSibling?.classList.toggle('more'); more.textContent = more.previousElementSibling?.classList.contains('more') ? '收起' : '展开全文'; }
  });
  return api;
}

// 伪二维码（示意，不可扫描）——按链接内容生成固定图案
function fakeQr(canvas, seed) {
  const n = 21, g = canvas.getContext('2d'); canvas.width = canvas.height = n;
  let h = 2166136261; for (const ch of seed) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1000) / 1000; };
  g.fillStyle = '#fff'; g.fillRect(0, 0, n, n); g.fillStyle = '#26242E';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (rnd() > 0.52) g.fillRect(x, y, 1, 1);
  for (const [ox, oy] of [[0, 0], [n - 7, 0], [0, n - 7]]) { g.fillStyle = '#26242E'; g.fillRect(ox, oy, 7, 7); g.fillStyle = '#fff'; g.fillRect(ox + 1, oy + 1, 5, 5); g.fillStyle = '#26242E'; g.fillRect(ox + 2, oy + 2, 3, 3); }
}

// 分享：入场券式票根（复制链接 / 保存票根 / 以访客身份打开）
export function shareModal({ kicker, title, cover, meta, stamp = '邀请函', link, color = '#4FC3F7', shadow = '#1E9BE6', owner = '我' }) {
  const el = mount(`<div class="modal" role="dialog" aria-label="分享">
    <div class="box">
      <h3>分享给朋友<button data-x aria-label="关闭">✕</button></h3>
      <div class="ticket" style="background:${color};box-shadow:0 6px 0 ${shadow}">
        <div class="top" style="background-image:url('${cover}')"><span class="stamp">${esc(stamp)}</span>
          <div class="name"><small>${esc(kicker)}</small><b>${esc(title)}</b></div></div>
        <div class="bottom" style="background:${color}"><div class="meta">${meta}</div><div class="qr"><canvas></canvas></div></div>
      </div>
      <div class="share-to">
        <button data-copy><i style="background:#FF2442">🔗</i>复制链接</button>
        <button data-save><i style="background:#FFB800">🎟</i>保存票根</button>
        <button data-visit><i style="background:#1E9BE6">👀</i>访客视角</button>
      </div>
      <p class="share-tip">朋友打开链接就能直接走进来，不需要下载。每件展品都标着原作者，点一下就能回到原帖。</p>
    </div></div>`);
  fakeQr(el.querySelector('canvas'), link);
  const close = () => { el.classList.remove('open'); setTimeout(() => el.remove(), 350); };
  el.addEventListener('click', async e => {
    if (e.target === el || e.target.closest('[data-x]')) close();
    if (e.target.closest('[data-copy]')) {
      try { await navigator.clipboard.writeText(link); toast('链接已复制', '发给朋友，TA 打开就能逛'); }
      catch { prompt('复制这个链接发给朋友：', link); }
    }
    if (e.target.closest('[data-save]')) { await saveTicket({ kicker, title, cover, meta: el.querySelector('.meta').innerText, color, stamp, owner }); toast('票根已保存', '可以发到小红书或朋友圈'); }
    if (e.target.closest('[data-visit]')) window.open(link, '_blank');
  });
  requestAnimationFrame(() => el.classList.add('open'));
  return { close };
}

async function saveTicket({ kicker, title, cover, meta, color, stamp }) {
  const W = 900, H = 1300, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#FFF6E6'; g.fillRect(0, 0, W, H);
  g.fillStyle = color; g.beginPath(); g.roundRect(60, 60, W - 120, H - 120, 56); g.fill();
  const img = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = cover; });
  g.save(); g.beginPath(); g.roundRect(60, 60, W - 120, 760, [56, 56, 0, 0]); g.clip();
  if (img) { const s = Math.max((W - 120) / img.width, 760 / img.height); g.drawImage(img, 60 + (W - 120 - img.width * s) / 2, 60 + (760 - img.height * s) / 2, img.width * s, img.height * s); }
  const grd = g.createLinearGradient(0, 400, 0, 820); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(20,60,110,.75)'); g.fillStyle = grd; g.fillRect(60, 60, W - 120, 760);
  g.restore();
  g.fillStyle = '#fff'; g.font = '800 34px "PingFang SC","Microsoft YaHei",sans-serif'; g.fillText(kicker, 110, 700);
  g.font = '900 80px "PingFang SC","Microsoft YaHei",sans-serif'; g.fillText(title, 106, 790);
  g.setLineDash([18, 14]); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 6; g.beginPath(); g.moveTo(80, 860); g.lineTo(W - 80, 860); g.stroke();
  g.font = '700 36px "PingFang SC","Microsoft YaHei",sans-serif';
  meta.split('\n').forEach((line, i) => g.fillText(line, 110, 940 + i * 56));
  g.fillStyle = '#FF2442'; g.beginPath(); g.roundRect(W - 300, 100, 200, 64, 32); g.fill();
  g.fillStyle = '#fff'; g.font = '900 30px "PingFang SC","Microsoft YaHei",sans-serif'; g.fillText(stamp, W - 270, 143);
  g.fillStyle = '#FF2442'; g.font = '900 40px "PingFang SC","Microsoft YaHei",sans-serif'; g.fillText('岛岛', 110, H - 110);
  const a = document.createElement('a'); a.download = `${title}-票根.png`; a.href = c.toDataURL('image/png'); a.click();
}

// 访客打开分享链接时的欢迎卡
export function welcome({ from, title, sub, go = '走进去看看', onGo }) {
  const el = mount(`<div class="welcome"><div class="box">
    <span class="who"><i>${esc(from.slice(0, 1))}</i>${esc(from)} 邀请你</span>
    <h2>${esc(title)}</h2><p>${sub}</p>
    <button class="pill red">${esc(go)}</button></div></div>`);
  el.querySelector('button').onclick = () => { el.classList.add('hide'); setTimeout(() => el.remove(), 400); onGo?.(); };
  return el;
}

// 本地记录：重温用（来过几次、上次停在哪、看过哪些）
export const memory = {
  get(id) { try { return JSON.parse(localStorage.getItem(`island:${id}`)) || {}; } catch { return {}; } },
  set(id, patch) { const v = { ...memory.get(id), ...patch }; localStorage.setItem(`island:${id}`, JSON.stringify(v)); return v; },
};
