// 日记本的每一页（2D canvas）：封面、扉页、目录、每篇一个跨页、后记、结语
// 每个画页函数返回热区 [{ x, y, w, h, id, ... }]，坐标是 1000 × 1380 的页面像素
import { FONT, wrap } from '../core/text.js';

const PAPER = '#FFFBF3', INK = '#26242E', INK2 = '#5B5866', INK3 = '#9A96A3', PEN = '#2F4BA0', RED = '#FF2442';
const CN = ['一', '二', '三', '四', '五', '六'];
const wan = n => n >= 10000 ? `${(n / 10000).toFixed(1).replace(/\.0$/, '')}万` : String(n);
const dot = d => d.replaceAll('-', '.');

function seeded(s) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

function paper(g, W, H, side, seed = 1) {
  g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
  const r = seeded(seed * 97 + 5);
  g.fillStyle = 'rgba(150,120,80,.07)';
  for (let i = 0; i < 300; i++) g.fillRect(r() * W, r() * H, 2 + r() * 2, 2);
  const grd = side === 'R' ? g.createLinearGradient(0, 0, 90, 0) : g.createLinearGradient(W, 0, W - 90, 0);
  grd.addColorStop(0, 'rgba(110,80,40,.2)'); grd.addColorStop(1, 'rgba(110,80,40,0)');
  g.fillStyle = grd; side === 'R' ? g.fillRect(0, 0, 90, H) : g.fillRect(W - 90, 0, 90, H);
}

// 写一段字，返回写完后的 y
function text(g, str, x, y, { size = 36, weight = 700, color = INK, maxW = 800, lh = 1.45, maxLines = 99, align = 'left' } = {}) {
  g.font = `${weight} ${size}px ${FONT}`;
  g.fillStyle = color; g.textBaseline = 'top'; g.textAlign = align;
  const rows = wrap(g, str, maxW, maxLines);
  rows.forEach((row, i) => g.fillText(row, x, y + i * size * lh));
  g.textAlign = 'left';
  return y + rows.length * size * lh;
}
function chip(g, label, x, y, color, { size = 28, fg = '#fff' } = {}) {
  g.font = `800 ${size}px ${FONT}`;
  const w = g.measureText(label).width + size * 1.1, h = size * 1.6;
  g.fillStyle = color; rr(g, x, y, w, h, h / 2); g.fill();
  g.fillStyle = fg; g.textBaseline = 'middle'; g.fillText(label, x + size * 0.55, y + h / 2 + 1);
  g.textBaseline = 'top';
  return w;
}
function button(g, label, x, y, { bg = RED, fg = '#fff', size = 34, shadow = '#C4102C', w } = {}) {
  g.font = `800 ${size}px ${FONT}`;
  const bw = w || g.measureText(label).width + size * 1.6, bh = size * 2;
  g.fillStyle = shadow; rr(g, x, y + 7, bw, bh, bh / 2); g.fill();
  g.fillStyle = bg; rr(g, x, y, bw, bh, bh / 2); g.fill();
  g.fillStyle = fg; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillText(label, x + bw / 2, y + bh / 2 + 1);
  g.textAlign = 'left'; g.textBaseline = 'top';
  return { x, y, w: bw, h: bh + 7 };
}
function checkbox(g, x, y, s, on, color) {
  g.fillStyle = 'rgba(0,0,0,.1)'; rr(g, x, y + 5, s, s, s * 0.3); g.fill();
  g.fillStyle = on ? color : '#FFFFFF'; rr(g, x, y, s, s, s * 0.3); g.fill();
  g.lineWidth = 5; g.strokeStyle = on ? color : '#C9BCA6'; rr(g, x + 2, y + 2, s - 4, s - 4, s * 0.28); g.stroke();
  if (on) { g.strokeStyle = '#fff'; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(x + s * 0.24, y + s * 0.52); g.lineTo(x + s * 0.43, y + s * 0.7); g.lineTo(x + s * 0.76, y + s * 0.3); g.stroke(); }
}
// 拍立得：白框 + 照片（居中裁切）+ 一截胶带
function polaroid(g, img, cx, cy, w, rot, tape = 'rgba(255,111,163,.75)') {
  const pad = w * 0.06, ih = w - pad * 2, h = ih + pad + w * 0.2;
  g.save(); g.translate(cx, cy); g.rotate(rot * Math.PI / 180);
  g.fillStyle = 'rgba(60,40,20,.18)'; g.fillRect(-w / 2 + 8, -h / 2 + 12, w, h);
  g.fillStyle = '#FFFFFF'; g.fillRect(-w / 2, -h / 2, w, h);
  if (img) {
    const s = Math.max(ih / img.width, ih / img.height), sw = ih / s, sh = ih / s;
    g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, -w / 2 + pad, -h / 2 + pad, ih, ih);
  }
  g.fillStyle = tape; g.save(); g.rotate(-0.08); g.fillRect(-w * 0.18, -h / 2 - 22, w * 0.36, 48); g.restore();
  g.restore();
}
function pageNo(g, n, side, W, H) {
  g.font = `800 26px ${FONT}`; g.fillStyle = INK3; g.textBaseline = 'alphabetic';
  g.textAlign = side === 'L' ? 'left' : 'right';
  g.fillText(`P.${String(n).padStart(2, '0')}`, side === 'L' ? 80 : W - 80, H - 60);
  g.textAlign = 'left'; g.textBaseline = 'top';
}
function star(g, cx, cy, r, color, rot = 0) {
  g.save(); g.translate(cx, cy); g.rotate(rot); g.fillStyle = color; g.beginPath();
  for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr2 = i % 2 ? r * 0.45 : r; g.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); }
  g.closePath(); g.fill(); g.restore();
}

export function makePages({ data, imgs, mascot, state }) {
  const notes = data.notes, ch = data.chapters, N = 14;
  const byNo = no => notes[no - 1];
  const checksOf = no => state.checks[no] || [];
  const doneOf = no => checksOf(no).filter(Boolean).length;
  const totalDone = () => notes.reduce((s, n) => s + doneOf(n.no), 0);

  const pages = {
    // ---------- 封面 ----------
    '0:f'(g, W, H) {
      g.fillStyle = '#FFD44A'; g.fillRect(0, 0, W, H);
      const r = seeded(11); g.fillStyle = 'rgba(200,140,0,.12)';
      for (let i = 0; i < 500; i++) g.fillRect(r() * W, r() * H, 3, 3);
      g.strokeStyle = 'rgba(38,36,46,.12)'; g.lineWidth = 6; rr(g, 34, 34, W - 68, H - 68, 40); g.stroke();
      chip(g, 'DIARY', 80, 84, RED, { size: 30 });
      text(g, '岛岛 · 2026', W - 80, 92, { size: 28, weight: 800, color: 'rgba(38,36,46,.55)', align: 'right' });
      text(g, data.title, 76, 170, { size: 148, weight: 900, color: INK, maxW: 880 });
      text(g, `${data.stats.total} 篇自我成长收藏，装订成册`, 82, 360, { size: 40, weight: 800, color: '#6B5200' });
      const pick = src => imgs[src];
      polaroid(g, pick(notes.find(n => n.idx === 2).images[0].src), 330, 720, 390, -6, 'rgba(79,195,247,.75)');
      polaroid(g, pick(notes.find(n => n.idx === 10).images[0].src), 680, 660, 350, 5);
      polaroid(g, pick(notes.find(n => n.idx === 4).images[0].src), 540, 960, 330, -2, 'rgba(94,214,180,.8)');
      g.save(); g.translate(850, 480); g.rotate(0.2);
      g.fillStyle = RED; g.beginPath(); g.arc(0, 0, 82, 0, Math.PI * 2); g.fill();
      text(g, String(data.stats.total), 0, -52, { size: 72, weight: 900, color: '#fff', align: 'center' });
      text(g, '篇', 0, 22, { size: 30, weight: 800, color: '#fff', align: 'center' });
      g.restore();
      star(g, 130, 520, 36, '#5ED6B4', 0.3); star(g, 900, 1010, 30, '#FF6FA3', -0.2); star(g, 160, 1080, 22, '#FFFFFF', 0.5);
      g.fillStyle = '#FFFDF8'; rr(g, 70, 1150, 600, 150, 30); g.fill();
      const owner = `${state.owner} 的日记本`;
      let os = 50; g.font = `900 ${os}px ${FONT}`; while (os > 30 && g.measureText(owner).width > 550) { os -= 2; g.font = `900 ${os}px ${FONT}`; }
      text(g, owner, 100, 1172 + (50 - os) / 2, { size: os, weight: 900, maxW: 560, maxLines: 1 });
      text(g, `${dot(data.stats.from).slice(0, 7)} — ${dot(data.stats.to).slice(0, 7)} 收藏`, 102, 1246, { size: 28, weight: 700, color: INK2 });
      if (mascot) g.drawImage(mascot, 770, 1080, 170, 204);
      return [];
    },
    // ---------- 扉页 ----------
    '0:b'(g, W, H) {
      paper(g, W, H, 'L', 2);
      if (mascot) g.drawImage(mascot, W / 2 - 80, 120, 160, 192);
      let y = text(g, `这本日记里，收着 ${data.stats.total} 个你想成为的样子。`, W / 2, 360, { size: 62, weight: 900, maxW: 760, align: 'center', lh: 1.35 });
      y = text(g, `它们是你在 ${data.stats.from.slice(0, 4)} 年 ${+data.stats.from.slice(5, 7)} 月到 ${data.stats.to.slice(0, 4)} 年 ${+data.stats.to.slice(5, 7)} 月之间，陆续收藏的。`, W / 2, y + 40, { size: 34, color: INK2, maxW: 760, align: 'center' });
      y = text(g, `和你一起收藏过它们的，还有 ${wan(data.stats.collects)} 人。`, W / 2, y + 12, { size: 34, color: INK2, maxW: 760, align: 'center' });
      const by = y + 70;
      g.fillStyle = '#FFE9EE'; rr(g, 110, by, W - 220, 380, 36); g.fill();
      text(g, '怎么用这本日记', 160, by + 40, { size: 44, weight: 900, color: RED });
      ['点右边那页往后翻，点左边那页往回翻', '每篇都有几件小事，做到了就打个勾', '也可以给收藏它时的自己，写一句回信'].forEach((t, i) => {
        g.fillStyle = RED; g.beginPath(); g.arc(172, by + 146 + i * 72 + 18, 9, 0, Math.PI * 2); g.fill();
        text(g, t, 200, by + 146 + i * 72, { size: 32, color: INK, maxW: W - 360, maxLines: 1 });
      });
      return [];
    },
    // ---------- 目录 ----------
    '1:f'(g, W, H) {
      paper(g, W, H, 'R', 3);
      text(g, '目录', 110, 80, { size: 100, weight: 900 });
      text(g, `${ch.length} 章 · ${data.stats.total} 篇 · ${data.stats.todos} 件小事`, 112, 210, { size: 30, weight: 800, color: INK3 });
      const spots = [];
      let y = 280;
      ch.forEach((c, ci) => {
        const w = chip(g, `第${CN[ci]}章`, 110, y, c.color, { size: 26 });
        text(g, c.name, 110 + w + 18, y - 2, { size: 44, weight: 900 });
        y += 66;
        notes.filter(n => n.chapter === ci).forEach(n => {
          const d = doneOf(n.no);
          g.font = `900 32px ${FONT}`; g.fillStyle = c.color; g.fillText(String(n.no).padStart(2, '0'), 120, y);
          text(g, n.short, 190, y - 2, { size: 34, weight: 700, maxW: 520, maxLines: 1 });
          g.font = `700 34px ${FONT}`; const tw = Math.min(520, g.measureText(n.short).width);
          g.fillStyle = '#D9D1C3'; for (let x = 200 + tw + 16; x < W - 260; x += 14) g.fillRect(x, y + 26, 5, 5);
          if (d) { g.font = `800 26px ${FONT}`; g.fillStyle = '#13A06F'; g.textAlign = 'right'; g.fillText(`✓${d}/${n.todo.length}`, W - 210, y + 4); g.textAlign = 'left'; }
          g.font = `800 28px ${FONT}`; g.fillStyle = INK2; g.textAlign = 'right'; g.fillText(`P.${String(2 * n.no + 1).padStart(2, '0')}`, W - 100, y + 2); g.textAlign = 'left';
          spots.push({ x: 90, y: y - 14, w: W - 170, h: 62, id: 'goto', s: n.no + 1 });
          y += 60;
        });
        y += 22;
      });
      return spots;
    },
    // ---------- 后记 ----------
    '13:b'(g, W, H) {
      paper(g, W, H, 'L', 4);
      text(g, '后记', 80, 80, { size: 100, weight: 900 });
      text(g, '翻到最后一页的你', 84, 212, { size: 32, weight: 800, color: INK3 });
      const done = totalDone(), all = data.stats.todos, replies = Object.values(state.replies).filter(Boolean).length;
      g.font = `900 140px ${FONT}`; g.fillStyle = RED; g.fillText(String(done), 80, 300);
      const nw = g.measureText(String(done)).width;
      text(g, `/ ${all}`, 100 + nw, 370, { size: 56, weight: 900, color: INK3 });
      text(g, '件小事，已经做到了', 84, 470, { size: 40, weight: 800 });
      g.fillStyle = '#EFE7DA'; rr(g, 84, 550, W - 200, 30, 15); g.fill();
      g.fillStyle = RED; rr(g, 84, 550, Math.max(30, (W - 200) * done / all), 30, 15); g.fill();
      let y = 630;
      ch.forEach((c, ci) => {
        const ns = notes.filter(n => n.chapter === ci), d = ns.reduce((s, n) => s + doneOf(n.no), 0), a = ns.reduce((s, n) => s + n.todo.length, 0);
        text(g, c.name, 84, y, { size: 30, weight: 800, color: INK2, maxW: 300, maxLines: 1 });
        g.fillStyle = '#EFE7DA'; rr(g, 400, y + 8, 400, 20, 10); g.fill();
        g.fillStyle = c.color; rr(g, 400, y + 8, Math.max(20, 400 * d / a), 20, 10); g.fill();
        text(g, `${d}/${a}`, 830, y, { size: 28, weight: 800, color: INK3 });
        y += 56;
      });
      text(g, replies ? `你还给过去的自己写了 ${replies} 封回信。` : '还没给过去的自己写回信，翻回去写一句吧。', 84, y + 24, { size: 32, weight: 700, color: PEN, maxW: W - 200 });
      text(g, '这本日记里反复出现的词', 84, y + 110, { size: 28, weight: 800, color: INK3 });
      let x = 84;
      data.words.forEach((w, i) => { x += chip(g, w, x, y + 160, ch[i % ch.length].color, { size: 30 }) + 14; });
      const b = button(g, '分享这本日记', 84, H - 220, { size: 34 });
      if (mascot) g.drawImage(mascot, W - 260, H - 300, 150, 180);
      return [{ ...b, id: 'share' }];
    },
    // ---------- 结语（封底内页） ----------
    board(g, W, H) {
      paper(g, W, H, 'R', 5);
      text(g, '一年后，再打开它', 110, 120, { size: 76, weight: 900, maxW: 800 });
      const d = new Date(); d.setFullYear(d.getFullYear() + 1);
      const ds = `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
      let y = text(g, `把这本日记封存起来。${ds}，岛岛会提醒你回来看看：哪些小事，已经变成了习惯。`, 112, 260, { size: 36, color: INK2, maxW: 780, lh: 1.6 });
      const spots = [];
      if (state.sealed) {
        g.save(); g.translate(640, y + 150); g.rotate(-0.18);
        g.strokeStyle = RED; g.lineWidth = 8; g.beginPath(); g.arc(0, 0, 130, 0, Math.PI * 2); g.stroke();
        g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 112, 0, Math.PI * 2); g.stroke();
        text(g, '已封存', 0, -56, { size: 52, weight: 900, color: RED, align: 'center' });
        text(g, dot(state.sealed), 0, 14, { size: 30, weight: 900, color: RED, align: 'center' });
        g.restore();
        y += 330;
      } else {
        const b = button(g, '封存成时间胶囊', 112, y + 60, { size: 36 });
        spots.push({ ...b, id: 'capsule' });
        y += 220;
      }
      const c = button(g, '合上日记', 112, y + 20, { size: 34, bg: '#F2EDE3', fg: INK, shadow: '#DDD3C2' });
      spots.push({ ...c, id: 'close' });
      if (mascot) g.drawImage(mascot, W - 330, H - 400, 200, 240);
      g.fillStyle = '#FFFFFF'; rr(g, 120, H - 330, 480, 120, 30); g.fill();
      g.beginPath(); g.moveTo(590, H - 290); g.lineTo(650, H - 300); g.lineTo(590, H - 250); g.fill();
      text(g, '我会记得提醒你的！', 150, H - 300, { size: 36, weight: 800 });
      pageNo(g, 30, 'R', W, H);
      return spots;
    },
  };

  // ---------- 每篇：左页（是什么） ----------
  function left(no) {
    return (g, W, H) => {
      const n = byNo(no), c = ch[n.chapter];
      paper(g, W, H, 'L', no * 3);
      chip(g, `第${CN[n.chapter]}章 · ${c.name}`, 80, 80, c.color, { size: 28 });
      g.font = `900 132px ${FONT}`; g.fillStyle = c.color; g.textBaseline = 'top'; g.fillText(String(no).padStart(2, '0'), 72, 150);
      let y = text(g, n.title, 80, 310, { size: 52, weight: 900, maxW: 840, maxLines: 3, lh: 1.32 });
      g.font = `800 30px ${FONT}`; g.fillStyle = INK2; const by = `@${n.author}`; g.fillText(by, 82, y + 20);
      const bw = g.measureText(by).width;
      text(g, `  ·  ${wan(n.collects)} 人收藏  ·  ${dot(n.postedAt)}`, 82 + bw, y + 22, { size: 28, weight: 700, color: INK3, maxW: 900 - bw, maxLines: 1 });
      const top = y + 100, bottom = 1090, mid = (top + bottom) / 2;
      const ims = n.images.map(i => imgs[i.src]);
      if (ims.length === 1) polaroid(g, ims[0], W / 2, mid + 10, Math.min(520, (bottom - top) * 0.82), -3);
      else { polaroid(g, ims[0], 340, mid - 10, 410, -6, 'rgba(79,195,247,.75)'); polaroid(g, ims[1], 660, mid + 40, 370, 5); }
      // 评论区便利贴
      g.save(); g.translate(560, 1120); g.rotate(0.035);
      g.fillStyle = 'rgba(60,40,20,.15)'; g.fillRect(8, 10, 360, 190);
      g.fillStyle = '#FFF1A8'; g.fillRect(0, 0, 360, 190);
      text(g, '评论区', 24, 20, { size: 24, weight: 900, color: '#B08600' });
      text(g, n.voice, 24, 58, { size: 27, weight: 700, color: INK, maxW: 316, maxLines: 4, lh: 1.35 });
      g.restore();
      const b = button(g, '看原帖 ↗', 80, 1160, { size: 30, bg: '#FFFFFF', fg: INK, shadow: '#E5DCCD' });
      pageNo(g, 2 * no + 1, 'L', W, H);
      return [{ ...b, id: 'url', no }];
    };
  }

  // ---------- 每篇：右页（我要做什么） ----------
  function right(no) {
    return (g, W, H) => {
      const n = byNo(no), c = ch[n.chapter], checks = checksOf(no);
      paper(g, W, H, 'R', no * 5);
      text(g, '收藏时，被这句话打动', 110, 76, { size: 30, weight: 800, color: INK3 });
      g.font = `900 150px Georgia, serif`; g.fillStyle = c.color; g.globalAlpha = 0.45; g.fillText('“', 94, 112); g.globalAlpha = 1;
      let y = text(g, n.quote, 170, 150, { size: 52, weight: 900, maxW: 760, maxLines: 4, lh: 1.38 });
      y += 40;
      g.strokeStyle = '#E5DCCD'; g.lineWidth = 4; g.setLineDash([14, 12]); g.beginPath(); g.moveTo(110, y); g.lineTo(W - 90, y); g.stroke(); g.setLineDash([]);
      y += 36;
      text(g, '可以马上做的小事', 110, y, { size: 30, weight: 800, color: INK3 });
      const d = checks.filter(Boolean).length;
      g.font = `800 26px ${FONT}`; g.fillStyle = d ? '#13A06F' : INK3; g.textAlign = 'right'; g.fillText(`做到了 ${d}/${n.todo.length}`, W - 100, y + 4); g.textAlign = 'left';
      y += 66;
      const spots = [];
      n.todo.forEach((t, i) => {
        const on = !!checks[i];
        checkbox(g, 112, y, 54, on, c.color);
        const ey = text(g, t, 192, y + 6, { size: 36, weight: 700, color: on ? INK3 : INK, maxW: 700, maxLines: 2, lh: 1.32 });
        if (on) { g.strokeStyle = 'rgba(38,36,46,.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(192, y + 30); g.lineTo(192 + Math.min(700, g.measureText(t).width), y + 30); g.stroke(); }
        const rh = Math.max(80, ey - y + 22);
        spots.push({ x: 90, y: y - 10, w: W - 170, h: rh, id: 'check', no, i });
        y += rh;
      });
      y += 18;
      text(g, '给收藏它时的自己', 110, y, { size: 30, weight: 800, color: INK3 });
      y += 56;
      const bh = Math.min(300, H - 130 - y);
      g.fillStyle = '#FFFFFF'; rr(g, 110, y, W - 200, bh, 26); g.fill();
      g.strokeStyle = '#E5DCCD'; g.lineWidth = 3; g.setLineDash([10, 10]); rr(g, 110, y, W - 200, bh, 26); g.stroke(); g.setLineDash([]);
      g.strokeStyle = '#EFE8DC'; g.lineWidth = 2;
      for (let ly = y + 74; ly < y + bh - 10; ly += 58) { g.beginPath(); g.moveTo(140, ly); g.lineTo(W - 120, ly); g.stroke(); }
      const reply = state.replies[no];
      if (reply) text(g, reply, 140, y + 24, { size: 36, weight: 700, color: PEN, maxW: W - 270, maxLines: Math.floor((bh - 30) / 58), lh: 1.6 });
      else text(g, state.visitor ? '这是 TA 写给自己的地方' : '点这里，写一句回信…', 140, y + 24, { size: 34, weight: 700, color: '#ADA390' });
      spots.push({ x: 110, y, w: W - 200, h: bh, id: 'reply', no });
      pageNo(g, 2 * no + 2, 'R', W, H);
      return spots;
    };
  }

  for (const n of notes) { pages[`${n.no}:b`] = left(n.no); pages[`${n.no + 1}:f`] = right(n.no); }

  return {
    N,
    draw(key, g, W, H) { return (pages[key] || ((gg) => { paper(gg, W, H, key.endsWith(':b') ? 'L' : 'R'); return []; }))(g, W, H); },
    label(s) {
      if (s <= 0) return '封面';
      if (s === 1) return '扉页 · 目录';
      if (s >= N) return '后记';
      const n = byNo(s - 1); return `第 ${n.no} 篇 · ${n.short}`;
    },
    keysForNote: no => [`${no}:b`, `${no + 1}:f`],
  };
}
