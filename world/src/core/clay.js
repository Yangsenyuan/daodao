// 黏土风基础件：颗粒材质 + 圆润几何 + 小角色 / 植物 / 云 / 画框 / 展签
// 视觉参考：小红书 REDesign 2025 年度报告（哑光、细颗粒、圆鼓鼓、饱和的红黄蓝绿）
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { textTexture } from './text.js';

export const C = {
  red: '#FF2442', pink: '#FF6FA3', rose: '#F9B4CC', sky: '#4FC3F7', skyDeep: '#1E9BE6', skyPale: '#BDE8FB',
  yellow: '#FFD44A', lemon: '#FFEA94', mint: '#5ED6B4', green: '#6CC46A', leaf: '#47A85A', grass: '#8FD46F',
  orange: '#FF8A3D', cream: '#FFF3DF', paper: '#FFFBF3', sand: '#F3D9A6', wood: '#D29A62', brown: '#A06B44',
  ink: '#26242E', white: '#FFFFFF', lilac: '#BBA9F5', indigo: '#4A4E8E', night: '#2C2F5C', coral: '#FF7A6B',
  stone: '#E7E0D4', blue: '#3E7BFA',
};

let lowQuality = false;
export const setLowQuality = v => { lowQuality = v; };

// ---------- 可平铺的颗粒噪声（做 bump / roughness，模拟黏土与毛毡表面） ----------
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let grainCanvas;
function grainImage() {
  if (grainCanvas) return grainCanvas;
  const S = 256, G = 16, r = rng(11);
  const coarse = Array.from({ length: G * G }, r);
  const at = (x, y) => coarse[((y % G + G) % G) * G + ((x % G + G) % G)];
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); const img = g.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const fx = x / S * G, fy = y / S * G, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const lump = (at(ix, iy) * (1 - sx) + at(ix + 1, iy) * sx) * (1 - sy) + (at(ix, iy + 1) * (1 - sx) + at(ix + 1, iy + 1) * sx) * sy;
    let v = 0.5 + (lump - 0.5) * 0.35 + (r() - 0.5) * 0.42;
    if (r() < 0.025) v -= 0.35; // 小凹点
    const k = Math.max(0, Math.min(255, v * 255)) | 0, i = (y * S + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = k; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return (grainCanvas = c);
}
const grainTex = new Map();
function grain(repeat) {
  if (!grainTex.has(repeat)) {
    const t = new THREE.CanvasTexture(grainImage());
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
    grainTex.set(repeat, t);
  }
  return grainTex.get(repeat);
}

// ---------- 材质（全局缓存，换场景不销毁） ----------
const mats = new Map();
export function clay(color, { rough = 0.92, bump = 1.6, repeat = 3, sheen = 0.55, emissive = null, ei = 0, side = THREE.FrontSide, transparent = false, opacity = 1 } = {}) {
  const key = [color, rough, bump, repeat, sheen, emissive, ei, side, transparent, opacity, lowQuality].join('|');
  if (mats.has(key)) return mats.get(key);
  const opts = { color, roughness: rough, metalness: 0, bumpMap: grain(repeat), bumpScale: bump, side, transparent, opacity };
  if (emissive) Object.assign(opts, { emissive, emissiveIntensity: ei });
  const m = lowQuality || !sheen
    ? new THREE.MeshStandardMaterial(opts)
    : new THREE.MeshPhysicalMaterial({ ...opts, sheen, sheenRoughness: 0.85, sheenColor: new THREE.Color('#ffffff') });
  mats.set(key, m);
  return m;
}
const basic = new Map();
export function flat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!basic.has(key)) basic.set(key, new THREE.MeshBasicMaterial({ color, ...opts }));
  return basic.get(key);
}

// ---------- 几何 ----------
const geos = new Map();
const cached = (key, make) => { if (!geos.has(key)) geos.set(key, make()); return geos.get(key); };
export const rboxGeo = (w, h, d, r = Math.min(w, h, d) * 0.22, seg = 3) => cached(`rb${w},${h},${d},${r},${seg}`, () => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, Math.min(w, h, d) / 2 - 0.001)));
export const sphereGeo = (r = 1, ws = 32, hs = 20) => cached(`sp${r},${ws},${hs}`, () => new THREE.SphereGeometry(r, ws, hs));
export const capsuleGeo = (r, len) => cached(`cap${r},${len}`, () => new THREE.CapsuleGeometry(r, len, 8, 20));
export const cylGeo = (rt, rb, h, seg = 32) => cached(`cy${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));

// 圆角三角棱柱（屋顶、山墙）
export const prismGeo = (w, h, d, bevel = 0.06) => cached(`pr${w},${h},${d},${bevel}`, () => {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + bevel, 0); s.lineTo(w / 2 - bevel, 0); s.lineTo(0, h - bevel); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 4 });
  g.translate(0, bevel, -(d - bevel * 2) / 2);
  g.computeVertexNormals();
  return g;
});

// 3D 值噪声，用来把球捏得不那么规整
function hash3(x, y, z) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
export function noise3(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  let n = 0;
  for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let c = 0; c < 2; c++)
    n += hash3(ix + a, iy + b, iz + c) * (a ? u : 1 - u) * (b ? v : 1 - v) * (c ? w : 1 - w);
  return n * 2 - 1;
}
export function blobGeo(r = 1, wobble = 0.1, seed = 1, freq = 1.6) {
  return cached(`bl${r},${wobble},${seed},${freq}`, () => {
    const g = new THREE.SphereGeometry(r, 40, 28), p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = noise3(v.x / r * freq + seed, v.y / r * freq + seed * 2, v.z / r * freq);
      v.multiplyScalar(1 + wobble * n); p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  });
}

export function mesh(geo, mat, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1, sx, sy, sz, cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  m.scale.set(sx ?? s, sy ?? s, sz ?? s);
  m.castShadow = cast; m.receiveShadow = receive;
  return m;
}
// 把一个物体摆到某处（Three.js 的 position 只读，不能整体赋值）
export const at = (o, x = 0, y = 0, z = 0, ry = 0) => { o.position.set(x, y, z); if (ry) o.rotation.y = ry; return o; };
export const rbox = (w, h, d, color, o = {}) => mesh(rboxGeo(w, h, d, o.r), clay(color, o.mat), o);

// ---------- 小角色：豆豆（原创，非任何现有 IP） ----------
export function bean({ color = C.pink, h = 1.15, r = 0.36, look = 0, accessory = null, seed = Math.random() * 10 } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  body.add(mesh(capsuleGeo(r, h - 2 * r), clay(color, { repeat: 2 }), { y: h / 2 }));
  // 脚
  for (const sx of [-1, 1]) body.add(mesh(sphereGeo(r * 0.36, 16, 12), clay(color, { repeat: 2 }), { x: sx * r * 0.45, y: r * 0.18, z: r * 0.25, sy: 0.6 }));
  // 眼睛（大白眼 + 黑瞳孔，略微看向一侧，带一点呆萌）
  const eyeY = h * 0.66;
  for (const sx of [-1, 1]) {
    const eye = mesh(sphereGeo(r * 0.3, 20, 14), clay(C.white, { bump: 0.4 }), { x: sx * r * 0.38, y: eyeY, z: r * 0.82, sz: 0.75 });
    body.add(eye);
    body.add(mesh(sphereGeo(r * 0.13, 14, 10), flat(C.ink), { x: sx * r * 0.38 + look * r * 0.08, y: eyeY - r * 0.04, z: r * 1.02, sz: 0.6, cast: false }));
    body.add(mesh(sphereGeo(r * 0.04, 8, 6), flat('#ffffff'), { x: sx * r * 0.38 + look * r * 0.08 + r * 0.05, y: eyeY + r * 0.02, z: r * 1.08, cast: false }));
    body.add(mesh(sphereGeo(r * 0.13, 12, 8), clay(C.rose, { bump: 0.3 }), { x: sx * r * 0.62, y: eyeY - r * 0.42, z: r * 0.78, sz: 0.4, cast: false }));
  }
  // 手
  for (const sx of [-1, 1]) body.add(mesh(capsuleGeo(r * 0.14, r * 0.42), clay(color, { repeat: 2 }), { x: sx * r * 1.02, y: h * 0.42, rz: sx * 0.5 }));
  if (accessory === 'beret') body.add(mesh(cylGeo(r * 0.75, r * 0.85, r * 0.22, 24), clay(C.red), { y: h + r * 0.02, rz: 0.2, x: r * 0.1 }));
  if (accessory === 'cap') {
    body.add(mesh(sphereGeo(r * 0.9, 24, 12), clay(C.sky), { y: h - r * 0.25, sy: 0.6 }));
    body.add(mesh(rboxGeo(r * 0.9, r * 0.08, r * 0.7, 0.03), clay(C.sky), { y: h - r * 0.22, z: r * 0.7 }));
  }
  if (accessory === 'bow') for (const sx of [-1, 1]) body.add(mesh(sphereGeo(r * 0.22, 14, 10), clay(C.yellow), { x: sx * r * 0.22, y: h + r * 0.05, rz: sx * 0.6, sx: 1.4 }));
  const base = 0;
  g.userData.update = t => {
    const k = Math.sin(t * 2.2 + seed);
    body.position.y = base + Math.max(0, k) * 0.05;
    body.scale.set(1 + k * 0.02, 1 - k * 0.025, 1 + k * 0.02);
  };
  return g;
}

// ---------- 植物 / 道具 ----------
export function pottedPlant({ pot = C.orange, leaf = C.leaf, h = 1.1 } = {}) {
  const g = new THREE.Group();
  g.add(mesh(cylGeo(0.26, 0.2, 0.4, 24), clay(pot), { y: 0.2 }));
  g.add(mesh(rboxGeo(0.56, 0.08, 0.56, 0.04), clay(pot), { y: 0.42, sy: 1 }));
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    g.add(mesh(blobGeo(0.22, 0.12, i + 1), clay(leaf, { repeat: 2 }), { x: Math.cos(a) * 0.15, y: 0.55 + h * 0.35 + (i % 2) * 0.18, z: Math.sin(a) * 0.15, sx: 0.7, sy: 1.6, sz: 0.5, ry: -a, rz: Math.cos(a) * 0.4 }));
  }
  return g;
}
export function cactus({ h = 1.4, color = C.green } = {}) {
  const g = new THREE.Group();
  g.add(mesh(capsuleGeo(0.22, h), clay(color, { repeat: 4, bump: 2.2 }), { y: h / 2 + 0.22 }));
  g.add(mesh(capsuleGeo(0.13, 0.42), clay(color, { repeat: 4, bump: 2.2 }), { x: 0.3, y: h * 0.62, rz: -0.2 }));
  g.add(mesh(capsuleGeo(0.11, 0.3), clay(color, { repeat: 4, bump: 2.2 }), { x: -0.27, y: h * 0.5, rz: 0.25 }));
  g.add(mesh(sphereGeo(0.09, 12, 8), clay(C.pink), { y: h + 0.44 }));
  return g;
}
export function flower(color = C.pink, h = 0.5, seed = 0) {
  const g = new THREE.Group();
  g.add(mesh(cylGeo(0.02, 0.025, h, 6), clay(C.leaf), { y: h / 2, cast: false }));
  g.add(mesh(sphereGeo(0.07, 10, 8), clay(C.leaf), { x: 0.06, y: h * 0.45, sx: 1.6, sy: 0.4, rz: 0.4, cast: false }));
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2 + seed;
    g.add(mesh(sphereGeo(0.075, 12, 8), clay(color, { bump: 0.8 }), { x: Math.cos(a) * 0.08, y: h, z: Math.sin(a) * 0.08, sy: 0.5, cast: false }));
  }
  g.add(mesh(sphereGeo(0.055, 10, 8), clay(C.yellow), { y: h + 0.02, cast: false }));
  return g;
}
export function tree({ h = 2.2, color = C.green, seed = 1 } = {}) {
  const g = new THREE.Group();
  g.add(mesh(cylGeo(0.12, 0.18, h * 0.6, 12), clay(C.wood), { y: h * 0.3 }));
  g.add(mesh(blobGeo(0.75, 0.18, seed), clay(color, { repeat: 2, bump: 2 }), { y: h * 0.75, sy: 1.1 }));
  g.add(mesh(blobGeo(0.5, 0.18, seed + 3), clay(color, { repeat: 2, bump: 2 }), { x: 0.45, y: h * 0.62, z: 0.2 }));
  return g;
}
export function cloud(seed = 1, color = '#FFFFFF') {
  const parts = [[0, 0, 0, 1], [0.95, -0.15, 0.1, 0.72], [-0.9, -0.2, 0, 0.68], [0.35, 0.45, -0.1, 0.7], [-0.4, 0.35, 0.15, 0.6]];
  const geos2 = parts.map(([x, y, z, r], i) => blobGeo(r, 0.08, seed + i).clone().translate(x, y, z));
  const g = mergeGeometries(geos2);
  const m = mesh(g, clay(color, { bump: 2.4, repeat: 2, sheen: 0.8 }), { cast: false, receive: false });
  m.scale.set(1, 0.72, 0.8);
  return m;
}
export function bench(color = C.wood) {
  const g = new THREE.Group();
  g.add(rbox(2.2, 0.16, 0.6, color, { y: 0.48 }));
  for (const x of [-0.85, 0.85]) g.add(rbox(0.16, 0.42, 0.5, color, { x, y: 0.22 }));
  return g;
}

// ---------- 画框：圆鼓鼓的彩色黏土框 + 照片 ----------
export function framed(tex, w, h, { color = C.yellow, border = 0.13, depth = 0.14, glow = 1 } = {}) {
  const g = new THREE.Group();
  g.add(mesh(rboxGeo(w + border * 2, h + border * 2, depth, Math.min(0.09, border * 0.8)), clay(color, { repeat: 2 }), { z: depth / 2 }));
  g.add(mesh(rboxGeo(w + 0.04, h + 0.04, 0.03, 0.01), clay(C.paper, { bump: 0.3 }), { z: depth + 0.005, cast: false }));
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(glow, glow, glow) }));
  pic.material.userData.own = true;
  pic.position.z = depth + 0.025;
  g.add(pic);
  g.userData.picture = pic;
  return g;
}

// ---------- 文字牌：圆角黏土板 + 文字贴图 ----------
export function sign(lines, { w = 1.2, h = 0.5, color = C.paper, depth = 0.06, px = 320, textColor, align = 'left', pad, radius, valign } = {}) {
  const g = new THREE.Group();
  g.add(mesh(rboxGeo(w, h, depth, Math.min(0.06, h * 0.25)), clay(color, { bump: 0.6, emissive: color, ei: 0.42 }), { z: depth / 2 }));
  const tex = textTexture({ w: Math.round(w * px), h: Math.round(h * px), lines, color: textColor, align, pad, radius, valign });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
  plane.material.userData.own = true;
  plane.position.z = depth + 0.004;
  g.add(plane);
  g.userData.texture = tex;
  return g;
}

// ---------- 假灯光：光锥 + 地面光斑（比真灯便宜，手机也能跑） ----------
let coneTex, spotTex;
function gradTex(radial) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = radial ? g.createRadialGradient(64, 64, 0, 64, 64, 64) : g.createLinearGradient(0, 0, 0, 128);
  grd.addColorStop(0, '#ffffff'); grd.addColorStop(radial ? 0.35 : 0.1, radial ? '#b0b0b0' : '#9a9a9a'); grd.addColorStop(1, '#000000');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.userData.shared = true;
  return t;
}
export function lightCone(rTop, rBottom, h, color = '#FFE7B0', strength = 0.35) {
  coneTex ||= gradTex(false);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, 32, 1, true),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength), map: coneTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  m.renderOrder = 5; m.material.userData.own = true;
  return m;
}
export function floorSpot(r, color = '#FFE7B0', strength = 0.4) {
  spotTex ||= gradTex(true);
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength), map: spotTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI / 2; m.renderOrder = 4; m.material.userData.own = true;
  return m;
}

// 墙面光晕：贴在画后面的径向渐变，像一束射灯打在墙上
export function wallGlow(w, h, color = '#FFE7B0', strength = 0.5) {
  spotTex ||= gradTex(true);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength), map: spotTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  m.material.userData.own = true; m.renderOrder = 3;
  return m;
}

// 天空渐变背景
export function skyTexture(top = '#47B8F3', bottom = '#CFEFFF') {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const g = c.getContext('2d'), grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, top); grd.addColorStop(1, bottom); g.fillStyle = grd; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
