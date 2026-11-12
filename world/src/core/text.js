// 文字贴图：展签、路牌、对话气泡都画在 canvas 上，再贴进 3D 场景
import * as THREE from 'three';

export const FONT = '"PingFang SC","HarmonyOS Sans SC","MiSans","Microsoft YaHei","Noto Sans SC",system-ui,sans-serif';
export const fontOf = (weight, size) => `${weight} ${size}px ${FONT}`;

// 按宽度折行（中文逐字、英文尽量按词）
export function wrap(g, text, maxW, maxLines = 99) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    const tokens = para.match(/[A-Za-z0-9'’.,!?:;%\-–()/&]+\s*|\s+|./gu) || [''];
    for (const tk of tokens) {
      // 中文标点不放到行首：宁可让它稍微超出一点，挂在上一行末尾
      const hang = /^[，。、；：？！”’）》」』…~～]/.test(tk) && g.measureText(line + tk).width <= maxW * 1.08;
      if (g.measureText(line + tk).width > maxW && line && !hang) { out.push(line.trimEnd()); line = tk.trimStart(); }
      else line += tk;
      while (g.measureText(line).width > maxW && line.length > 1) { // 超长英文单词硬切
        let k = line.length - 1; while (k > 1 && g.measureText(line.slice(0, k)).width > maxW) k--;
        out.push(line.slice(0, k)); line = line.slice(k);
      }
    }
    out.push(line);
  }
  if (out.length > maxLines) { const cut = out.slice(0, maxLines); cut[maxLines - 1] = cut[maxLines - 1].replace(/.?$/, '…'); return cut; }
  return out;
}

function finish(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// lines: [{ t, size, weight, color, gap, maxLines }]，size 以画布像素计
export function textTexture({ w = 512, h = 256, lines = [], color = '#26242E', align = 'left', pad = null, bg = null, radius = 0, valign = 'top' } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  pad ??= Math.round(Math.min(w, h) * 0.1);
  if (bg) { g.fillStyle = bg; g.beginPath(); g.roundRect(0, 0, w, h, radius); g.fill(); }
  const blocks = lines.map(l => typeof l === 'string' ? { t: l } : l).map(l => {
    const size = l.size || Math.round(h * 0.16);
    g.font = fontOf(l.weight || 700, size);
    return { ...l, size, rows: wrap(g, l.t ?? '', w - pad * 2, l.maxLines || 99) };
  });
  const total = blocks.reduce((s, b, i) => s + b.rows.length * b.size * 1.28 + (i ? (b.gap ?? b.size * 0.35) : 0), 0);
  let y = valign === 'middle' ? (h - total) / 2 : pad;
  g.textBaseline = 'top';
  blocks.forEach((b, i) => {
    if (i) y += b.gap ?? b.size * 0.35;
    g.font = fontOf(b.weight || 700, b.size);
    g.fillStyle = b.color || color;
    if (b.chip) { // 彩色小标签
      const tw = g.measureText(b.rows[0]).width, ph = b.size * 0.45;
      const x0 = align === 'center' ? (w - tw) / 2 - ph : pad;
      g.fillStyle = b.chip; g.beginPath(); g.roundRect(x0, y - b.size * 0.18, tw + ph * 2, b.size * 1.36, b.size * 0.68); g.fill();
      g.fillStyle = b.color || '#fff'; g.textAlign = 'left'; g.fillText(b.rows[0], x0 + ph, y);
      y += b.size * 1.36; return;
    }
    g.textAlign = align;
    const x = align === 'center' ? w / 2 : align === 'right' ? w - pad : pad;
    for (const row of b.rows) { g.fillText(row, x, y); y += b.size * 1.28; }
  });
  return finish(c);
}

// 对话气泡（给展厅里的小豆豆说“观众留言”）
export function bubbleTexture(text, { bg = '#FFFFFF', color = '#26242E', maxW = 460 } = {}) {
  const c = document.createElement('canvas'); const g = c.getContext('2d');
  const size = 34, pad = 26;
  g.font = `700 ${size}px ${FONT}`;
  const rows = wrap(g, text, maxW - pad * 2, 3);
  const tw = Math.max(...rows.map(r => g.measureText(r).width));
  const w = Math.ceil(tw + pad * 2), h = Math.ceil(rows.length * size * 1.3 + pad * 2 - size * 0.3), tail = 22;
  c.width = w + 8; c.height = h + tail + 8;
  g.font = `700 ${size}px ${FONT}`;
  g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.roundRect(4, 8, w, h, 30); g.fill();
  g.fillStyle = bg; g.beginPath(); g.roundRect(4, 2, w, h, 30); g.fill();
  g.beginPath(); g.moveTo(w / 2 - 16, h); g.lineTo(w / 2 + 4, h + tail); g.lineTo(w / 2 + 18, h - 2); g.fill();
  g.fillStyle = color; g.textBaseline = 'top';
  rows.forEach((r, i) => g.fillText(r, 4 + pad, 2 + pad - 4 + i * size * 1.3));
  const t = finish(c);
  t.userData = { aspect: c.width / c.height };
  return t;
}

// 岛上的建筑名牌：彩色圆角标签 + 小字
export function labelTexture(title, sub, { bg = '#FFFFFF', accent = '#FF2442' } = {}) {
  const c = document.createElement('canvas'); const g = c.getContext('2d');
  const ts = 54, ss = 30, pad = 30;
  g.font = fontOf(900, ts); const tw = g.measureText(title).width;
  g.font = `700 ${ss}px ${FONT}`; const sw = g.measureText(sub).width;
  const w = Math.ceil(Math.max(tw, sw) + pad * 2), h = ts + ss + pad * 2 + 6;
  c.width = w + 8; c.height = h + 30;
  g.fillStyle = 'rgba(0,0,0,.14)'; g.beginPath(); g.roundRect(4, 10, w, h, 34); g.fill();
  g.fillStyle = bg; g.beginPath(); g.roundRect(4, 2, w, h, 34); g.fill();
  g.beginPath(); g.moveTo(w / 2 - 14, h); g.lineTo(w / 2 + 4, h + 24); g.lineTo(w / 2 + 16, h); g.fill();
  g.textBaseline = 'top'; g.textAlign = 'center';
  g.fillStyle = '#26242E'; g.font = fontOf(900, ts); g.fillText(title, 4 + w / 2, 2 + pad - 4);
  g.fillStyle = accent; g.font = `700 ${ss}px ${FONT}`; g.fillText(sub, 4 + w / 2, 2 + pad + ts + 6);
  const t = finish(c);
  t.userData = { aspect: c.width / c.height };
  return t;
}

// 用贴图做一个始终朝向镜头的小牌子
export function billboard(tex, height = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  s.material.userData.own = true;
  const aspect = tex.userData?.aspect || tex.image.width / tex.image.height;
  s.scale.set(height * aspect, height, 1);
  s.center.set(0.5, 0);
  s.renderOrder = 10;
  return s;
}
