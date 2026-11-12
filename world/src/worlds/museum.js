// 博物馆世界：把“看展-莫奈”专辑布成一条参观路线
// 序厅（12 张展讯）→ ① 错过的展 → ② 还能去的展 → ③ 即将开幕 → ④ 出口花园（留言墙 + 纪念品车）
import * as THREE from 'three';
import { C, at, clay, mesh, rbox, rboxGeo, sphereGeo, cylGeo, blobGeo, bean, pottedPlant, cactus, flower, tree, bench, framed, sign, lightCone, floorSpot, wallGlow, skyTexture, cloud } from '../core/clay.js';
import { textTexture, bubbleTexture, billboard, FONT, wrap } from '../core/text.js';
import { disposeScene } from '../core/engine.js';
import { Walk } from '../core/walk.js';
import { mount, esc, toast, banner, hint, sheet, shareModal, welcome, memory, fmt } from '../ui/overlay.js';
import { ownerName } from '../core/profile.js';
import { daodao } from '../core/mascot.js';

const STATUS = {
  closed: { label: '已闭展', color: '#4A4E8E', chip: 'closed', cta: '同类展开展时提醒我', done: '好，有同类展开展时提醒你' },
  open: { label: '在展', color: '#13A06F', chip: 'open', cta: '加入看展计划', done: '已加入看展计划' },
  soon: { label: '即将开幕', color: '#E0457E', chip: 'soon', cta: '开幕提醒我', done: '开幕当天提醒你' },
  flash: { label: '限时快闪', color: '#C98A00', chip: 'flash', cta: '收进周末计划', done: '已收进周末计划' },
};
const WALL_H = 4.4, DOOR_W = 3.2, DOOR_H = 3.1;
const STYLE = {
  lobby: { w: 14, d: 12, wall: '#FFF0DA', floor: '#F1D3A0', trim: C.red, ceil: '#FFF8EC', light: 1.05, frames: [C.red, C.yellow, C.sky, C.pink], dot: '#FF2442' },
  missed: { w: 12, d: 20, wall: '#4D5192', floor: '#6C68A6', trim: C.lilac, ceil: '#3F427C', light: 0.55, frames: [C.lilac, C.rose, C.sky], dot: '#4A4E8E', cone: 0.6 },
  open: { w: 12, d: 24, wall: '#FFEDB0', floor: '#BDEBD7', trim: C.mint, ceil: '#FFF7DC', light: 1.1, frames: [C.mint, C.sky, C.pink, C.orange], dot: '#13A06F', cone: 0.12, glowColor: '#FFF4D6' },
  soon: { w: 10, d: 10, wall: '#FFC6DA', floor: '#FFE0EA', trim: C.pink, ceil: '#FFE6EE', light: 0.95, frames: [C.pink], dot: '#E0457E', cone: 0.3 },
  garden: { w: 16, d: 16, open: true, floor: C.grass, trim: C.leaf, light: 1.2, frames: [C.yellow, C.sky, C.pink], dot: '#47A85A' },
};

export class Museum {
  constructor(engine, { data, albums, from, resume }) {
    this.engine = engine; this.data = data; this.albums = albums; this.from = from; this.resume = resume;
    this.picks = []; this.floors = []; this.blocks = []; this.anim = []; this.beans = []; this.tour = []; this.tex = {};
    this.mem = memory.get(data.id);
    this.notes = data.notes;
  }
  fov(portrait) { return portrait ? 74 : 62; }
  get envIntensity() { return 0.3; }

  // ---------- 布局 ----------
  layout() {
    let z = 0;
    this.halls = this.data.halls.map((h, i) => {
      const st = STYLE[h.id];
      const hall = { ...h, ...st, i, z0: z, z1: z - st.d };
      z -= st.d;
      return hall;
    });
    this.hallById = Object.fromEntries(this.halls.map(h => [h.id, h]));
  }
  walkable(x, z) {
    const m = 0.45;
    const inRoom = this.halls.some(h => x > -h.w / 2 + m && x < h.w / 2 - m && z < h.z0 - m && z > h.z1 + m);
    const inDoor = this.halls.slice(1).some(h => Math.abs(x) < DOOR_W / 2 - 0.35 && Math.abs(z - h.z0) < 0.9);
    if (!inRoom && !inDoor) return false;
    return !this.blocks.some(b => Math.abs(x - b.x) < b.hw && Math.abs(z - b.z) < b.hd);
  }
  block(x, z, hw, hd) { this.blocks.push({ x, z, hw: hw + 0.3, hd: hd + 0.3 }); }

  async build() {
    this.layout();
    const s = this.scene = new THREE.Scene();
    s.background = skyTexture('#46B6F2', '#DDF3FF');
    s.fog = new THREE.Fog('#E6F6FF', 30, 70);
    this.hemi = new THREE.HemisphereLight('#FFFFFF', '#D9C4A0', 1.4); s.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight('#FFF2DE', 1.5);
    sun.castShadow = true;
    const sm = this.engine.mobile ? 1024 : 2048;
    sun.shadow.mapSize.set(sm, sm);
    Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 0.5, far: 40 });
    sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
    s.add(sun, sun.target);

    await this.loadTextures();
    for (const h of this.halls) this.room(h);
    this.lobby(); this.missed(); this.open(); this.soon(); this.garden();

    const st = this.mem.pos && this.resume ? this.mem.pos : { x: 0, z: -2.2, yaw: 0 };
    this.walk = new Walk(this.engine, {
      x: st.x, z: st.z, yaw: st.yaw, pitch: -0.02,
      walkable: (x, z) => this.walkable(x, z),
      onTap: ndc => this.tap(ndc), onHover: ndc => this.hover(ndc),
    });
    this.walk.floors = this.floors;
    window.__museum = this;
    this.ray = new THREE.Raycaster();
    this.ui();
    this.mem = memory.set(this.data.id, { visits: (this.mem.visits || 0) + 1 });
  }

  async loadTextures() {
    const srcs = new Set();
    for (const n of Object.values(this.notes)) {
      srcs.add(n.poster.src);
      for (const e of [...n.exhibits, ...n.garden]) srcs.add(e.src);
    }
    let done = 0;
    const label = document.getElementById('fade-text');
    await Promise.all([...srcs].map(async src => {
      const wide = src.endsWith('9-2.jpg');
      this.tex[src] = await this.engine.loadTexture(src, wide ? 2048 : undefined);
      done++; if (label) label.textContent = `正在布展… ${done}/${srcs.size}`;
    }));
  }

  // ---------- 通用：一个展厅的地板、墙、天花、门洞 ----------
  room(h) {
    const s = this.scene, zc = (h.z0 + h.z1) / 2;
    const floor = rbox(h.w + 0.6, 0.3, h.d, h.floor, { y: -0.15, z: zc, cast: false, mat: { repeat: 8, bump: 1.2 } });
    floor.userData.floor = true; this.floors.push(floor); s.add(floor);
    if (h.open) return;
    s.add(rbox(h.w + 0.6, 0.24, h.d, h.ceil, { y: WALL_H + 0.12, z: zc, cast: false, receive: false, mat: { repeat: 8, bump: 0.6, emissive: h.ceil, ei: h.id === 'missed' ? 0.25 : 0.7 } }));
    for (const sx of [-1, 1]) {
      s.add(rbox(0.3, WALL_H, h.d, h.wall, { x: sx * (h.w / 2 + 0.15), y: WALL_H / 2, z: zc, cast: false, mat: { repeat: 6, bump: 1 } }));
      s.add(rbox(0.12, 0.22, h.d - 0.1, h.trim, { x: sx * (h.w / 2 - 0.04), y: 0.11, z: zc, cast: false }));
    }
    const endWall = (z, door) => {
      if (!door) { s.add(rbox(h.w, WALL_H, 0.2, h.wall, { y: WALL_H / 2, z, cast: false, mat: { repeat: 6, bump: 1 } })); return; }
      const seg = (h.w - DOOR_W) / 2;
      for (const sx of [-1, 1]) s.add(rbox(seg, WALL_H, 0.2, h.wall, { x: sx * (DOOR_W / 2 + seg / 2), y: WALL_H / 2, z, cast: false, mat: { repeat: 4, bump: 1 } }));
      s.add(rbox(DOOR_W, WALL_H - DOOR_H, 0.2, h.wall, { y: DOOR_H + (WALL_H - DOOR_H) / 2, z, cast: false }));
      // 门框：一圈彩色黏土边
      const dz = z + (z === h.z0 - 0.1 ? -0.12 : 0.12);
      for (const sx of [-1, 1]) s.add(rbox(0.26, DOOR_H + 0.13, 0.16, h.trim, { x: sx * (DOOR_W / 2 + 0.05), y: (DOOR_H + 0.13) / 2, z: dz }));
      s.add(rbox(DOOR_W + 0.36, 0.26, 0.16, h.trim, { y: DOOR_H + 0.05, z: dz }));
    };
    const last = h.i === this.halls.length - 1;
    endWall(h.z0 - 0.1, h.i > 0);
    if (!last) endWall(h.z1 + 0.1, true);
  }

  // 在侧墙上挂一件东西（画框 + 展签 + 光束），返回导览机位
  hang(h, { item, note, side, z, maxW = 2.05, maxH = 1.6, y = 1.85, color, kind = 'exhibit', plaque = true }) {
    const tex = this.tex[item.src];
    const ar = item.w / item.h;
    let fw = maxW, fh = fw / ar; if (fh > maxH) { fh = maxH; fw = fh * ar; }
    const g = new THREE.Group();
    g.position.set(side * h.w / 2, 0, z);
    g.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    const fr = framed(tex, fw, fh, { color, border: 0.12 });
    fr.position.y = y;
    g.add(fr);
    const status = STATUS[note.status];
    if (plaque) {
      const pl = sign([
        { t: item.name || note.show, size: 44, weight: 900, maxLines: 2 },
        { t: `${note.city} · ${note.venue}`, size: 27, weight: 700, color: '#6B6875', maxLines: 2 },
        { t: kind === 'poster' ? status.label : `${status.label}${note.status === 'soon' ? '' : ' · ' + note.dates}`, size: 25, chip: status.color, color: '#fff', gap: 14 },
      ], { w: 0.78, h: 0.56, px: 560, pad: 30 });
      pl.position.set(fw / 2 + 0.6, 1.25, 0);
      g.add(pl);
    }
    if (h.cone) {
      // 射灯：墙上一圈暖光 + 贴墙的淡光束 + 地上的光斑（光束贴墙放，不挡住画）
      const glow = wallGlow(fw * 2.1, fh * 2.0 + 0.6, h.glowColor || '#FFE2A8', h.cone);
      glow.position.set(0, y + 0.15, 0.012);
      const lamp = rbox(0.36, 0.12, 0.3, C.lemon, { y: WALL_H - 0.08, z: 0.32, cast: false, mat: { emissive: '#FFE7A0', ei: 1.4 } });
      const beam = lightCone(0.1, Math.max(fw, fh) * 0.62, WALL_H - y + 0.4, h.glowColor || '#FFE2A8', h.cone * 0.16);
      beam.position.set(0, y + (WALL_H - y + 0.4) / 2 - 0.4, 0.42);
      const spot = floorSpot(1.1, h.glowColor || '#FFE2A8', h.cone * 0.35);
      spot.position.set(0, 0.012, 0.9);
      g.add(glow, lamp, beam, spot);
    }
    this.scene.add(g);
    const nx = side < 0 ? 1 : -1;
    const stand = { x: side * h.w / 2 + nx * 2.75, z, yaw: Math.atan2(nx, 0), pitch: 0.03 };
    fr.userData.pick = { type: kind, note, item, stand, hall: h };
    this.picks.push(fr);
    return stand;
  }

  // 一个看画的小豆豆 + 观众留言气泡
  visitor(x, z, faceYaw, text, opts = {}) {
    const b = bean({ h: 1.05, r: 0.33, seed: x * 3 + z, ...opts });
    b.position.set(x, 0, z); b.rotation.y = faceYaw;
    this.scene.add(b); this.anim.push(b);
    const bub = billboard(bubbleTexture(text), 0.38);
    bub.position.set(x, 1.48, z);
    bub.material.opacity = 0;
    this.scene.add(bub);
    this.beans.push({ b, bub, text, note: opts.note });
    b.traverse(o => { if (o.isMesh) o.userData.pickRoot = b; });
    b.userData.pick = { type: 'bean', text, note: opts.note };
    this.picks.push(b);
    this.block(x, z, 0.35, 0.35);
    return b;
  }

  // 序厅迎宾：岛岛
  host(x, z, text) {
    const m = daodao({ scale: 0.72 });
    m.position.set(x, 0, z); m.userData.baseY = 0;
    this.scene.add(m);
    m.userData.update0 = m.userData.update;
    this.anim.push({ userData: { update: t => { m.userData.face(Math.atan2(this.walk.pos.x - x, this.walk.pos.z - z)); m.userData.update0(t, 0.016); } } });
    const bub = billboard(bubbleTexture(text), 0.38);
    bub.position.set(x, 1.65, z); bub.material.opacity = 0;
    this.scene.add(bub);
    this.beans.push({ b: m, bub, text, y: 1.65 });
    m.userData.pick = { type: 'bean', text };
    this.picks.push(m);
    this.block(x, z, 0.4, 0.4);
  }

  // ---------- 序厅 ----------
  lobby() {
    const h = this.hallById.lobby, s = this.scene, d = this.data;
    // 入口门（回到岛岛）
    const door = new THREE.Group();
    door.add(rbox(2.0, 2.9, 0.2, '#8A5A44', { y: 1.45 }));
    door.add(rbox(0.12, 0.5, 0.12, C.yellow, { x: 0.65, y: 1.4, z: 0.12 }));
    const ds = sign([{ t: '← 回到岛岛', size: 54, weight: 900, color: '#fff' }], { w: 1.6, h: 0.36, color: C.red, px: 300, align: 'center', pad: 16, valign: 'middle' });
    ds.position.set(0, 3.25, 0.02); door.add(ds);
    door.position.set(0, 0, h.z0 - 0.21); door.rotation.y = Math.PI; // 正面朝向展厅
    s.add(door);
    door.userData.pick = { type: 'exit' }; this.picks.push(door);

    // 吊在中间的大标题
    const title = sign([
      { t: d.title, size: 120, weight: 900, color: '#FF2442' },
      { t: d.subtitle, size: 46, weight: 700, color: '#5B5866' },
    ], { w: 4.2, h: 1.2, px: 280, align: 'center', color: C.paper, pad: 20 });
    title.position.set(0, 3.0, h.z0 - 6.6);
    s.add(title);
    for (const sx of [-1.7, 1.7]) s.add(mesh(cylGeo(0.012, 0.012, 1.0, 6), clay('#8D8A99'), { x: sx, y: 4.0, z: h.z0 - 6.55, cast: false }));
    // 地毯 + 墙裙：让序厅更有颜色
    s.add(mesh(cylGeo(3.2, 3.2, 0.04, 64), clay(C.red, { repeat: 6, bump: 2.4 }), { y: 0.02, z: h.z0 - 6.2, cast: false }));
    s.add(mesh(cylGeo(2.7, 2.7, 0.05, 64), clay(C.yellow, { repeat: 6, bump: 2.4 }), { y: 0.03, z: h.z0 - 6.2, cast: false }));
    s.add(mesh(cylGeo(1.4, 1.4, 0.06, 48), clay(C.sky, { repeat: 4, bump: 2.4 }), { y: 0.04, z: h.z0 - 6.2, cast: false }));
    for (const sx of [-1, 1]) s.add(rbox(0.06, 1.0, h.d - 0.4, C.pink, { x: sx * (h.w / 2 - 0.01), y: 0.5, z: (h.z0 + h.z1) / 2, cast: false }));
    s.add(rbox(h.w - 0.4, 1.0, 0.06, C.pink, { y: 0.5, z: h.z1 + 0.13, cast: false }));

    // 远墙两侧：数字
    const st = d.stats;
    const stat = (x, lines) => { const p = sign(lines, { w: 3.2, h: 1.5, px: 300, align: 'center', color: C.paper, pad: 26 }); p.position.set(x, 1.9, h.z1 + 0.21); s.add(p); };
    stat(-4.1, [{ t: `${st.total} 场展`, size: 120, weight: 900, color: '#26242E' }, { t: `${st.cities} 座城市 · 都是我收藏过的`, size: 40, color: '#6B6875' }]);
    stat(4.1, [{ t: `错过 ${st.closed} · 还能去 ${st.open}`, size: 74, weight: 900, color: '#26242E' }, { t: `即将开幕 ${st.soon} · 限时快闪 ${st.flash}`, size: 46, weight: 800, color: '#E0457E' }, { t: `按 ${d.today.replaceAll('-', '.')} 的展期计算`, size: 32, color: '#9A96A3' }]);
    const nextSign = sign([{ t: '① 错过的展 →', size: 64, weight: 900, color: '#fff' }], { w: 2.4, h: 0.5, color: C.indigo, px: 260, align: 'center', pad: 16 });
    nextSign.position.set(0, DOOR_H + 0.62, h.z1 + 0.21); s.add(nextSign);

    // 两侧墙：12 张展讯海报（按发布时间）
    const list = Object.values(this.notes).sort((a, b) => a.postedAt.localeCompare(b.postedAt));
    list.forEach((note, i) => {
      const side = i < 6 ? -1 : 1, k = i % 6;
      const z = h.z0 - 2.0 - k * 1.62;
      const g = new THREE.Group();
      g.position.set(side * h.w / 2, 0, z);
      g.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      const ar = note.poster.w / note.poster.h; let fh = 1.3, fw = fh * ar; if (fw > 1.15) { fw = 1.15; fh = fw / ar; }
      const fr = framed(this.tex[note.poster.src], fw, fh, { color: h.frames[i % 4], border: 0.08, depth: 0.1 });
      fr.position.y = 2.05; g.add(fr);
      const stt = STATUS[note.status];
      const tag = sign([{ t: `${note.city} · ${stt.label}`, size: 50, weight: 900, color: '#fff' }], { w: 1.25, h: 0.28, color: stt.color, px: 300, align: 'center', pad: 12, valign: 'middle' });
      tag.position.set(0, 1.05, 0); g.add(tag);
      s.add(g);
      const nx = side < 0 ? 1 : -1;
      fr.userData.pick = { type: 'poster', note, item: note.poster, stand: { x: side * h.w / 2 + nx * 2.3, z, yaw: Math.atan2(nx, 0), pitch: 0.12 }, hall: h };
      this.picks.push(fr);
    });

    // 前台 + 迎宾
    const desk = new THREE.Group();
    desk.add(mesh(cylGeo(1.05, 1.1, 1.0, 40), clay(C.red), { y: 0.5 }));
    desk.add(mesh(cylGeo(1.18, 1.18, 0.14, 40), clay(C.cream), { y: 1.05 }));
    desk.position.set(-3.6, 0, h.z0 - 7.6); s.add(desk);
    this.block(-3.6, h.z0 - 7.6, 1.1, 1.1);
    this.host(-3.6, h.z0 - 8.95, `${st.total} 场展，错过了 ${st.closed} 场。别难过，它们都在里面`);
    s.add(at(pottedPlant(), h.w / 2 - 0.8, 0, h.z1 + 0.8));
    s.add(at(pottedPlant({ pot: C.sky }), -h.w / 2 + 0.8, 0, h.z1 + 0.8));
    const bc = bench(C.sky); bc.position.set(3.4, 0, h.z0 - 7.2); bc.rotation.y = Math.PI / 2; s.add(bc); this.block(3.4, h.z0 - 7.2, 0.35, 1.1);
    this.tour.push({ label: '序厅', x: 0, z: h.z0 - 2.0, yaw: 0, pitch: 0.06, hall: h });
  }

  // 把一个厅的展品分到左右墙
  hangHall(h, items, { from = 2.6, to = 2.6, maxW, maxH } = {}) {
    const left = items.filter((_, i) => i % 2 === 0), right = items.filter((_, i) => i % 2 === 1);
    const out = [];
    for (const [side, arr] of [[-1, left], [1, right]]) {
      const span = h.d - from - to;
      arr.forEach((it, k) => {
        const z = h.z0 - from - (arr.length === 1 ? span / 2 : span * k / (arr.length - 1));
        const stand = this.hang(h, { ...it, side, z, color: h.frames[(k + (side > 0 ? 1 : 0)) % h.frames.length], maxW, maxH });
        out.push({ ...stand, z, item: it.item, note: it.note, hall: h });
      });
    }
    return out.sort((a, b) => b.z - a.z);
  }

  itemsOf(h) { return h.notes.flatMap(i => this.notes[i].exhibits.filter(e => !e.wide).map(item => ({ item, note: this.notes[i] }))); }

  // ---------- ① 错过的展 ----------
  missed() {
    const h = this.hallById.missed;
    const stops = this.hangHall(h, this.itemsOf(h));
    stops.forEach(st => this.tour.push({ ...st, label: st.item.name || st.note.show, pick: true }));
    const s = this.scene;
    const bc = bench(C.lilac); bc.position.set(0, 0, (h.z0 + h.z1) / 2); bc.rotation.y = Math.PI / 2; s.add(bc); this.block(0, (h.z0 + h.z1) / 2, 0.35, 1.1);
    const n3 = this.notes[3], n5 = this.notes[5];
    this.visitor(-2.6, stops[1].z, Math.PI / 2 + Math.PI, n3.voices[2] || '哇，好看', { color: C.rose, accessory: 'bow', note: n3 });
    this.visitor(2.7, stops[stops.length - 2].z + 0.3, -Math.PI / 2 + Math.PI, n5.voices[0] || '值得一去', { color: C.sky, note: n5 });
    s.add(at(pottedPlant({ pot: C.lilac }), -h.w / 2 + 0.7, 0, h.z1 + 0.7));
    const ns = sign([{ t: '② 还能去的展 →', size: 64, weight: 900, color: '#26242E' }], { w: 2.6, h: 0.5, color: C.mint, px: 260, align: 'center', pad: 16 });
    ns.position.set(0, DOOR_H + 0.62, h.z1 + 0.21); s.add(ns);
  }

  // ---------- ② 还能去的展 ----------
  open() {
    const h = this.hallById.open, s = this.scene;
    // 中间一面独立展墙：南京德基《金陵图》长卷
    const wideNote = this.notes[9], wide = wideNote.exhibits.find(e => e.wide);
    const zw = h.z0 - 8.2;
    const wall = rbox(7.2, 3.4, 0.4, C.paper, { y: 1.7, z: zw, cast: true, mat: { repeat: 4, bump: 0.8 } });
    s.add(wall); this.block(0, zw, 3.6, 0.2);
    const fw = 6.4, fh = fw * wide.h / wide.w;
    const fr = framed(this.tex[wide.src], fw, fh, { color: C.orange, border: 0.1, depth: 0.1, glow: 0.3 });
    fr.position.set(0, 1.9, zw + 0.2); s.add(fr);
    const pl = sign([{ t: '《金陵图》数字长卷 · 零点美术馆', size: 46, weight: 900 }, { t: `南京 · ${wideNote.venue} · ${wideNote.dates}`, size: 30, color: '#6B6875' }, { t: '在展 · 还能去', size: 28, chip: '#13A06F', color: '#fff', gap: 12 }], { w: 2.4, h: 0.62, px: 360, pad: 22 });
    pl.position.set(-2.0, 0.42, zw + 0.21); s.add(pl);
    const back = sign([{ t: '还能去的展', size: 120, weight: 900, color: '#13A06F' }, { t: '纽约 · 南京 · 东京 · 巴黎，现在出发还看得到真迹', size: 44, color: '#5B5866' }], { w: 5.4, h: 1.3, px: 220, align: 'center', color: C.paper, pad: 20 });
    back.position.set(0, 2.0, zw - 0.21); back.rotation.y = Math.PI; s.add(back);
    const wstand = { x: 0, z: zw + 4.6, yaw: 0, pitch: 0.06 };
    fr.userData.pick = { type: 'exhibit', note: wideNote, item: { ...wide, name: '《金陵图》数字长卷' }, stand: wstand, hall: h };
    this.picks.push(fr);

    const stops = this.hangHall(h, this.itemsOf(h), { from: 2.4, to: 2.4 });
    const all = [...stops, { ...wstand, z: zw + 0.01, item: { ...wide, name: '《金陵图》数字长卷' }, note: wideNote, hall: h }].sort((a, b) => b.z - a.z);
    all.forEach(st => this.tour.push({ ...st, label: st.item.name || st.note.show, pick: true }));
    const n10 = this.notes[10], n6 = this.notes[6];
    this.visitor(-2.9, stops.find(x => x.note === n6)?.z ?? h.z0 - 14, -Math.PI / 2, n6.voices[3] || n6.voices[0], { color: C.orange, accessory: 'cap', note: n6 });
    this.visitor(2.8, stops.find(x => x.note === n10)?.z ?? h.z0 - 18, Math.PI / 2, n10.voices[0], { color: C.mint, note: n10 });
    for (const [x, z] of [[-h.w / 2 + 0.8, h.z0 - 0.9], [h.w / 2 - 0.8, h.z1 + 0.9]]) s.add(at(cactus({ h: 1.2 }), x, 0, z));
    const bc = bench(C.mint); bc.position.set(0, 0, h.z1 + 5); s.add(bc); this.block(0, h.z1 + 5, 1.1, 0.35);
    const ns = sign([{ t: '③ 即将开幕 →', size: 64, weight: 900, color: '#fff' }], { w: 2.4, h: 0.5, color: C.pink, px: 260, align: 'center', pad: 16 });
    ns.position.set(0, DOOR_H + 0.62, h.z1 + 0.21); s.add(ns);
  }

  // ---------- ③ 即将开幕：盖着布的画 + 倒计时 ----------
  soon() {
    const h = this.hallById.soon, s = this.scene, note = this.notes[4];
    const days = note.opensIn;
    const cd = sign([
      { t: `还有 ${days} 天`, size: 150, weight: 900, color: '#E0457E' },
      { t: `${note.city} · ${note.venue} · ${note.show}`, size: 44, weight: 800, color: '#26242E' },
      { t: `${note.dates.split(' – ')[0]} 开幕 · 点我设置开幕提醒`, size: 36, color: '#6B6875' },
    ], { w: 4.6, h: 1.85, px: 220, align: 'center', color: C.paper, pad: 22 });
    // 倒计时挂在远墙门洞上方；门洞两侧挂“去花园”
    cd.position.set(0, DOOR_H + 0.66, h.z1 + 0.21); cd.scale.setScalar(0.62);
    s.add(cd);
    const ns = sign([{ t: '④ 出口花园 →', size: 60, weight: 900, color: '#fff' }], { w: 2.0, h: 0.42, color: C.leaf, px: 260, align: 'center', pad: 14 });
    ns.position.set(-3.3, 2.0, h.z1 + 0.21); s.add(ns);
    cd.userData.pick = { type: 'soon', note, stand: { x: 0, z: h.z1 + 4.6, yaw: 0, pitch: 0.22 }, hall: h };
    this.picks.push(cd);
    // 两幅盖着粉色布的画
    note.exhibits.forEach((item, i) => {
      const side = i === 0 ? -1 : 1, z = (h.z0 + h.z1) / 2 + 0.6;
      const g = new THREE.Group();
      g.position.set(side * h.w / 2, 0, z); g.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      const cloth = mesh(blobGeo(1, 0.06, i + 3, 2.4), clay('#FF8FB8', { repeat: 3, bump: 2 }), { y: 1.9, z: 0.18, sx: 1.05, sy: 1.25, sz: 0.2 });
      g.add(cloth);
      g.add(rbox(0.16, 2.4, 0.06, C.yellow, { y: 1.9, z: 0.4, rz: 0.55 }));
      for (const sx of [-1, 1]) g.add(mesh(sphereGeo(0.2, 16, 12), clay(C.yellow), { x: sx * 0.2, y: 3.05, z: 0.35, sx: 1.4, rz: sx * 0.5 }));
      const tag = sign([{ t: '揭幕倒计时', size: 46, weight: 900, color: '#fff' }, { t: `${days} 天`, size: 64, weight: 900, color: '#fff' }], { w: 0.9, h: 0.6, color: '#E0457E', px: 300, align: 'center', pad: 16 });
      tag.position.set(1.55, 1.3, 0); g.add(tag);
      const glow = wallGlow(3.4, 3.6, '#FFD6E6', 0.45); glow.position.set(0, 1.95, 0.012); g.add(glow);
      s.add(g);
      const nx = side < 0 ? 1 : -1;
      cloth.userData.pick = { type: 'soon', note, item, stand: { x: side * h.w / 2 + nx * 2.8, z, yaw: Math.atan2(nx, 0), pitch: 0.06 }, hall: h };
      this.picks.push(cloth);
    });
    // 远处右侧的画架：伦敦这场展的海报（不挡住门和倒计时）
    const ex = 3.0, ez = h.z1 + 2.2;
    const easel = this.easel(this.tex[note.poster.src], note.poster, 1.0);
    easel.position.set(ex, 0, ez); easel.rotation.y = -0.55; s.add(easel); this.block(ex, ez, 0.7, 0.6);
    easel.userData.pick = { type: 'soon', note, item: note.poster, stand: { x: ex - 1.15, z: ez + 1.8, yaw: -0.55, pitch: -0.02 }, hall: h };
    this.picks.push(easel);
    this.visitor(ex - 1.4, ez + 0.2, -0.5, '等它开幕，一起去伦敦？', { color: C.lilac, accessory: 'bow', note });
    this.tour.push({ label: '即将开幕', x: 0, z: h.z0 - 1.6, yaw: 0, pitch: 0.1, hall: h, pick: false, note });
  }

  easel(tex, item, size = 1) {
    const g = new THREE.Group();
    for (const [x, rz, z] of [[-0.42, -0.12, 0.1], [0.42, 0.12, 0.1], [0, 0, -0.5]]) g.add(mesh(cylGeo(0.035, 0.04, 2.0, 8), clay(C.wood), { x, y: 0.98, z, rz, rx: z < 0 ? -0.28 : 0.04 }));
    g.add(rbox(1.1, 0.08, 0.16, C.wood, { y: 0.85, z: 0.14 }));
    const ar = item.w / item.h; let fh = 1.1 * size, fw = fh * ar; if (fw > 1.1 * size) { fw = 1.1 * size; fh = fw / ar; }
    const fr = framed(tex, fw, fh, { color: C.paper, border: 0.05, depth: 0.05 });
    fr.position.set(0, 0.92 + fh / 2 + 0.06, 0.16); fr.rotation.x = -0.08;
    g.add(fr);
    return g;
  }

  // ---------- ④ 出口花园：莫奈花园快闪 + 留言墙 + 纪念品车 ----------
  garden() {
    const h = this.hallById.garden, s = this.scene, note = this.notes[12];
    const zc = (h.z0 + h.z1) / 2;
    // 一圈矮树篱，前面留出口，后面是回岛的花拱门
    for (const sx of [-1, 1]) s.add(rbox(0.7, 1.1, h.d - 0.4, C.leaf, { x: sx * (h.w / 2 - 0.1), y: 0.55, z: zc, mat: { repeat: 6, bump: 2.4 } }));
    for (const sx of [-1, 1]) s.add(rbox((h.w - 3.6) / 2, 1.1, 0.7, C.leaf, { x: sx * ((h.w - 3.6) / 4 + 1.8), y: 0.55, z: h.z1 + 0.3, mat: { repeat: 6, bump: 2.4 } }));
    const arch = new THREE.Group();
    arch.add(mesh(new THREE.TorusGeometry(1.7, 0.2, 14, 40, Math.PI), clay(C.leaf, { repeat: 3, bump: 2.4 }), { y: 2.2 }));
    for (const sx of [-1, 1]) arch.add(mesh(cylGeo(0.2, 0.22, 2.2, 14), clay(C.leaf, { repeat: 3, bump: 2.4 }), { x: sx * 1.7, y: 1.1 }));
    for (let i = 0; i <= 12; i++) { const t = i / 12 * Math.PI; const f = flower([C.pink, C.yellow, C.white, C.red][i % 4], 0.05, i); f.position.set(Math.cos(t) * 1.7, 2.2 + Math.sin(t) * 1.7, 0.2); f.rotation.x = Math.PI / 2; f.scale.setScalar(1.8); arch.add(f); }
    const exitSign = sign([{ t: '回到岛岛 →', size: 60, weight: 900, color: '#fff' }], { w: 1.9, h: 0.42, color: C.red, px: 280, align: 'center', pad: 14, valign: 'middle' });
    exitSign.position.set(0, 4.15, 0.05); arch.add(exitSign);
    arch.position.set(0, 0, h.z1 + 0.35); s.add(arch);
    arch.userData.pick = { type: 'exit' }; this.picks.push(arch);
    // 花坛
    const fc = [C.pink, C.yellow, C.white, C.lilac, C.red, C.orange];
    const bed = (x, z, r) => {
      s.add(mesh(cylGeo(r, r + 0.08, 0.36, 36), clay(C.sand, { repeat: 4 }), { x, y: 0.18, z }));
      s.add(mesh(cylGeo(r - 0.08, r - 0.08, 0.06, 36), clay(C.brown, { repeat: 4 }), { x, y: 0.37, z, cast: false }));
      for (let i = 0; i < Math.round(r * r * 9); i++) {
        const a = i * 2.4, rr = Math.sqrt((i + 0.5) / (r * r * 9)) * (r - 0.18);
        const f = flower(fc[i % fc.length], 0.3 + (i % 3) * 0.12, i); f.position.set(x + Math.cos(a) * rr, 0.38, z + Math.sin(a) * rr); s.add(f);
      }
      this.block(x, z, r, r);
    };
    bed(-4.6, h.z0 - 3.2, 1.2); bed(4.8, h.z0 - 11.6, 1.0); bed(-4.9, h.z0 - 12.2, 0.9);
    s.add(at(tree({ h: 2.6, seed: 3 }), 6.1, 0, h.z0 - 2.0));
    s.add(at(tree({ h: 2.3, color: C.leaf, seed: 6 }), -6.2, 0, h.z0 - 8.0));
    // 莫奈花园快闪的照片，摆在一圈画架上
    const photos = note.garden;
    const stops = [];
    photos.forEach((item, i) => {
      const a = -0.95 + i / (photos.length - 1) * 1.9;
      const x = Math.sin(a) * 3.6, z = h.z0 - 7.4 - Math.cos(a) * 1.1 + 2.0;
      const e = this.easel(this.tex[item.src], item, 0.95);
      e.position.set(x, 0, z); e.rotation.y = -a * 0.85;
      s.add(e); this.block(x, z, 0.55, 0.45);
      const ry = e.rotation.y, nx = Math.sin(ry), nz = Math.cos(ry);
      const stand = { x: x + nx * 2.3, z: z + nz * 2.3, yaw: Math.atan2(nx, nz), pitch: 0.02 };
      e.userData.pick = { type: 'exhibit', note, item: { ...item, name: 'Chloé 莫奈花园' }, stand, hall: h };
      this.picks.push(e);
      if (i === 2) stops.push({ ...stand, label: 'Chloé 莫奈花园', note, item: { ...item, name: 'Chloé 莫奈花园' }, hall: h, pick: true });
    });
    const sg = sign([{ t: note.show, size: 56, weight: 900 }, { t: `${note.city} · ${note.venue} · ${note.dates}`, size: 30, color: '#6B6875' }, { t: STATUS.flash.label, size: 28, chip: STATUS.flash.color, color: '#fff', gap: 10 }], { w: 1.9, h: 0.62, px: 340, pad: 20 });
    const post = new THREE.Group(); post.add(sg); sg.position.y = 1.1; post.add(mesh(cylGeo(0.04, 0.05, 1.1, 8), clay(C.wood), { y: 0.55, z: -0.02 }));
    post.position.set(-4.3, 0, h.z0 - 6.2); post.rotation.y = 0.45; s.add(post);

    // 留言墙
    this.guestbook = this.buildGuestbook();
    this.guestbook.position.set(h.w / 2 - 0.9, 0, h.z0 - 7.2); this.guestbook.rotation.y = -Math.PI / 2;
    s.add(this.guestbook); this.block(h.w / 2 - 0.9, h.z0 - 7.2, 0.3, 1.9);
    const gstand = { x: h.w / 2 - 3.6, z: h.z0 - 7.2, yaw: -Math.PI / 2, pitch: 0.08, pb: 2.6 };
    this.guestbook.userData.pick = { type: 'guestbook', stand: gstand }; this.picks.push(this.guestbook);

    // 纪念品车：展品做成的徽章
    const cart = new THREE.Group();
    cart.add(rbox(1.8, 0.9, 0.9, C.sky, { y: 0.75 }));
    for (const sx of [-0.65, 0.65]) cart.add(mesh(cylGeo(0.26, 0.26, 0.12, 20), clay(C.ink), { x: sx, y: 0.26, z: 0.48, rx: Math.PI / 2 }));
    for (let i = 0; i < 6; i++) cart.add(rbox(0.32, 0.08, 1.2, i % 2 ? C.white : C.red, { x: -0.8 + i * 0.32, y: 2.25, z: 0.05, rx: 0.25, cast: false }));
    for (const sx of [-0.85, 0.85]) cart.add(mesh(cylGeo(0.03, 0.03, 1.1, 8), clay(C.cream), { x: sx, y: 1.75, z: -0.3 }));
    const badgeSrc = [this.notes[3].exhibits[0], this.notes[6].exhibits[0], this.notes[2].exhibits[0]];
    badgeSrc.forEach((it, i) => {
      const bg = new THREE.Group();
      bg.add(mesh(cylGeo(0.24, 0.24, 0.06, 32), clay([C.pink, C.yellow, C.sky][i]), { rx: Math.PI / 2 }));
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.19, 32), new THREE.MeshStandardMaterial({ map: this.tex[it.src], roughness: 0.4, emissive: '#fff', emissiveMap: this.tex[it.src], emissiveIntensity: 0.25 }));
      face.material.userData.own = true; face.position.z = 0.035; bg.add(face);
      bg.position.set(-0.55 + i * 0.55, 1.45, 0.47); bg.rotation.x = -0.25;
      cart.add(bg);
    });
    const cs = sign([{ t: '纪念品 · 把这场展带走', size: 46, weight: 900, color: '#fff' }], { w: 1.7, h: 0.3, color: C.red, px: 300, align: 'center', pad: 10 });
    cs.position.set(0, 1.0, 0.46); cart.add(cs);
    cart.position.set(-4.6, 0, h.z1 + 3.6); cart.rotation.y = 0.5; s.add(cart);
    this.block(-4.6, h.z1 + 3.6, 1.1, 0.8);
    cart.userData.pick = { type: 'souvenir', stand: { x: -2.9, z: h.z1 + 6.4, yaw: 0.55, pitch: -0.1 } }; this.picks.push(cart);

    this.visitor(3.2, h.z0 - 4.6, Math.PI - 0.6, note.voices[0] || '阳光好的时候来', { color: C.yellow, accessory: 'cap', note });
    this.visitor(h.w / 2 - 2.5, h.z0 - 9.0, -Math.PI / 2 + 0.3, '我也想留一句话 ✍️', { color: C.pink });
    for (let i = 0; i < 6; i++) { const c = cloud(i + 20); c.position.set(-18 + i * 7, 9 + (i % 3) * 2, h.z1 - 10 - (i % 2) * 6); c.scale.multiplyScalar(2 + (i % 2)); s.add(c); }

    this.tour.push(...stops);
    this.tour.push({ label: '留言墙', ...gstand, hall: h, type: 'guestbook' });
    this.tour.push({ label: '纪念品车', ...cart.userData.pick.stand, hall: h, type: 'souvenir' });
  }

  buildGuestbook() {
    const g = new THREE.Group();
    g.add(rbox(3.6, 2.0, 0.16, C.wood, { y: 1.55 }));
    for (const sx of [-1.5, 1.5]) g.add(mesh(cylGeo(0.07, 0.08, 1.6, 10), clay(C.brown), { x: sx, y: 0.8, z: -0.05 }));
    const c = document.createElement('canvas'); c.width = 1152; c.height = 640;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.89), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
    plane.material.userData.own = true;
    plane.position.set(0, 1.55, 0.085); g.add(plane);
    g.userData.canvas = c; g.userData.tex = tex;
    this.drawGuestbook(c, tex);
    return g;
  }

  guestNotes() {
    const fromNotes = Object.values(this.notes).flatMap(n => n.voices.slice(0, 1).map(v => ({ t: v, by: '原帖评论' }))).filter(v => v.t.length >= 4).slice(0, 7);
    return [...(this.mem.guest || []).map(t => ({ t, by: '你', mine: true })), ...fromNotes].slice(0, 10);
  }

  drawGuestbook(c, tex) {
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = '#FFFFFF'; g.font = `900 54px ${FONT}`; g.textBaseline = 'top'; g.fillText('留言墙', 36, 26);
    g.font = `700 28px ${FONT}`; g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText('来过的人留下的话（点一下也留一句）', 230, 46);
    const colors = ['#FFEA94', '#FFC6DA', '#BDE8FB', '#C9F2E2', '#E2D9FF'];
    this.guestNotes().forEach((n, i) => {
      const col = i % 5, row = Math.floor(i / 5);
      const x = 30 + col * 222, y = 120 + row * 255;
      g.save(); g.translate(x + 100, y + 110); g.rotate(((i * 37) % 9 - 4) * 0.012); g.translate(-100, -110);
      g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(6, 10, 200, 220);
      g.fillStyle = n.mine ? '#FF6FA3' : colors[i % 5]; g.fillRect(0, 0, 200, 220);
      g.fillStyle = n.mine ? '#fff' : '#26242E'; g.font = `800 28px ${FONT}`;
      wrap(g, n.t, 168, 5).forEach((line, k) => g.fillText(line, 16, 18 + k * 36));
      g.font = `700 20px ${FONT}`; g.fillStyle = n.mine ? 'rgba(255,255,255,.85)' : '#8A8494'; g.fillText(`— ${n.by}`, 16, 190);
      g.restore();
    });
    tex.needsUpdate = true;
  }

  // ---------- 交互 ----------
  hit(ndc) {
    this.ray.setFromCamera(ndc, this.engine.camera);
    const hits = this.ray.intersectObjects([...this.picks, ...this.floors], true);
    for (const hh of hits) {
      if (hh.object.userData.floor) return null;
      let o = hh.object; while (o && !o.userData.pick) o = o.parent;
      if (o) return o;
    }
    return null;
  }
  hover(ndc) {
    const o = this.hit(ndc);
    this.engine.canvas.style.cursor = o ? 'pointer' : 'grab';
    if (this.hovered !== o) { this.hovered = o; }
  }
  tap(ndc) {
    const o = this.hit(ndc);
    if (!o) { if (this.sheet.isOpen) { this.sheet.close(); return true; } return false; }
    this.act(o.userData.pick);
    return true;
  }

  async act(p, fromTour) {
    this.hintApi?.hide();
    if (p.type === 'exit') { location.hash = this.from ? `#/?from=${encodeURIComponent(this.from)}` : '#/'; return; }
    if (p.type === 'bean') { toast(`“${p.text}”`, p.note ? `来自《${p.note.title.slice(0, 16)}》的评论区` : '岛岛说'); return; }
    if (p.stand) await this.walk.flyTo(this.mobileStand(p.stand));
    if (p.type === 'exhibit' || p.type === 'poster') this.showItem(p);
    if (p.type === 'soon') this.showSoon(p);
    if (p.type === 'guestbook') this.showGuestbook();
    if (p.type === 'souvenir') this.share('纪念徽章');
  }

  // 手机上详情面板占下半屏：机位退后一点、低头一点，让画留在上半屏
  mobileStand(st) {
    if (!this.engine.portrait) return st;
    const back = st.pb ?? 0.7, nx = Math.sin(st.yaw), nz = Math.cos(st.yaw); // pb：竖屏时额外后退的距离（大件物体要退远一点才看得全）
    let x = st.x + nx * back, z = st.z + nz * back;
    if (!this.walkable(x, z)) { x = st.x; z = st.z; }
    return { ...st, x, z };
  }

  noteCard(note) {
    return `<div class="origin">
      <div class="by"><span class="av">${esc(note.author.slice(0, 1))}</span>${esc(note.author)} · 原帖 · ${esc(note.postedAt)}</div>
      <div class="t">${esc(note.title)}</div>
      <div class="d">${esc(note.desc)}</div><button data-more style="font-size:12px;color:#1E9BE6;font-weight:800;margin-top:4px">展开全文</button>
      <div class="stat"><span>♥ <b>${fmt(note.likes)}</b></span><span>⭐ <b>${fmt(note.collects)}</b></span><span>💬 <b>${fmt(note.comments)}</b></span></div>
    </div>
    ${note.voices.length ? `<div class="voices"><h4>观众说 · 来自原帖评论区</h4>${note.voices.map(v => `<span class="voice">${esc(v)}</span>`).join('')}</div>` : ''}`;
  }

  statusLine(note) {
    if (note.status === 'closed') return `已闭展（${note.dates}）· 你没赶上，但它在这儿`;
    if (note.status === 'open') return `${note.dates} · 现在出发还看得到`;
    if (note.status === 'soon') return `还有 ${note.opensIn} 天开幕`;
    return `${note.dates} · 去之前先确认是否还在`;
  }

  showItem(p) {
    const { note, item } = p, stt = STATUS[note.status];
    const key = `${note.idx}-${item.src}`;
    const seen = new Set(this.mem.seen || []); seen.add(key);
    this.mem = memory.set(this.data.id, { seen: [...seen] });
    const pic = item.src;
    const body = `<div class="pic"><img src="${pic}" alt=""></div>
      <div class="chips"><span class="chip ${stt.chip}">● ${stt.label}</span><span class="chip">📍 ${esc(note.city)}</span>${p.type === 'poster' ? '<span class="chip">展讯海报</span>' : ''}</div>
      <h2>${esc(p.type === 'poster' ? note.show : (item.name || note.show))}</h2>
      <div class="venue">${esc(note.venue)}${item.name ? ' · ' + esc(note.show) : ''}</div>
      <dl class="facts"><dt>展期</dt><dd>${esc(this.statusLine(note))}</dd><dt>收藏自</dt><dd>专辑「${esc(this.data.album)}」</dd>${note.exhibits.length > 1 && p.type !== 'poster' ? `<dt>同一篇</dt><dd>这篇笔记里还有 ${note.exhibits.length - 1} 件，挂在旁边</dd>` : ''}</dl>
      ${this.noteCard(note)}`;
    const goto = p.type === 'poster' && note.exhibits.length ? `<button class="pill ghost" data-goto>去看展品</button>` : '';
    const el = this.sheet.open(body, `<a class="pill ghost" href="${note.url}" target="_blank" rel="noopener">看原帖 ↗</a>${goto}<button class="pill red" data-cta>${stt.cta}</button>`);
    el.querySelector('[data-cta]').onclick = () => toast(stt.done, `${note.city} · ${note.venue}`);
    const g = el.querySelector('[data-goto]');
    if (g) g.onclick = () => { const st = this.tour.find(t => t.note === note && t.pick); this.sheet.close(); if (st) this.goTour(this.tour.indexOf(st)); };
  }

  showSoon(p) {
    const note = p.note;
    const imgs = note.exhibits.map(e => `<img src="${e.src}" alt="" style="width:48%;border-radius:14px;filter:blur(${p.item && p.item !== note.poster ? 0 : 6}px)">`).join('');
    const body = `<div class="chips"><span class="chip soon">● 即将开幕</span><span class="chip">📍 ${esc(note.city)}</span></div>
      <h2>${esc(note.show)}</h2><div class="venue">${esc(note.venue)} · ${esc(note.dates)}</div>
      <div style="display:flex;align-items:baseline;gap:8px;margin:4px 0 14px"><b style="font-size:46px;color:#E0457E;font-weight:900">${note.opensIn}</b><span style="font-weight:800;color:#5B5866">天后开幕</span></div>
      <h4>揭开一角 · 原帖里的预告</h4><div style="display:flex;gap:4%;margin-bottom:14px">${imgs}</div>
      ${this.noteCard(note)}`;
    const el = this.sheet.open(body, `<a class="pill ghost" href="${note.url}" target="_blank" rel="noopener">看原帖 ↗</a><button class="pill red" data-cta>开幕提醒我</button>`);
    el.querySelector('[data-cta]').onclick = () => toast('开幕当天提醒你', `${note.dates.split(' – ')[0]} · ${note.city} ${note.venue}`);
  }

  showGuestbook() {
    const body = `<h2>留言墙</h2><div class="venue">来过的人留下的话。朋友来逛时写的，也会贴在这里。</div>
      <textarea id="gb-input" maxlength="40" placeholder="比如：下次一起去看泰特那场！" style="width:100%;height:84px;border-radius:16px;border:2px solid rgba(0,0,0,.08);padding:12px;font:inherit;font-weight:600;resize:none;background:#fff"></textarea>
      <h4 style="margin-top:14px">墙上已经有</h4>${this.guestNotes().map(n => `<span class="voice">${esc(n.t)}</span>`).join('')}`;
    const el = this.sheet.open(body, `<button class="pill red" data-post>贴上去</button>`);
    el.querySelector('[data-post]').onclick = () => {
      const v = el.querySelector('#gb-input').value.trim();
      if (!v) { toast('先写一句吧'); return; }
      this.mem = memory.set(this.data.id, { guest: [v, ...(this.mem.guest || [])].slice(0, 3) });
      this.drawGuestbook(this.guestbook.userData.canvas, this.guestbook.userData.tex);
      this.sheet.close(); toast('贴上去了', '主人下次来会看到');
    };
  }

  share(stamp = '入场券') {
    const base = location.href.split('#')[0], d = this.data, first = this.notes[3].exhibits[0].src;
    shareModal({ kicker: `${this.from || ownerName()}的博物馆`, title: d.title, cover: first, stamp, owner: this.from || ownerName(),
      meta: `<b>${d.stats.total} 场展 · ${d.stats.cities} 座城市</b><br>错过 ${d.stats.closed} · 还能去 ${d.stats.open} · 即将开幕 ${d.stats.soon}`,
      link: `${base}#/w/${d.id}?from=${encodeURIComponent(this.from || ownerName())}` });
  }

  goHall(id) {
    const h = this.hallById[id];
    this.sheet.close();
    return this.walk.flyTo({ x: 0, z: h.z0 - (h.i ? 1.4 : 2.2), yaw: 0, pitch: 0.04 });
  }

  // ---------- 导览 ----------
  async goTour(i) {
    this.tourI = (i + this.tour.length) % this.tour.length;
    const st = this.tour[this.tourI];
    this.updateTourUi();
    const pickable = st.pick && st.note && st.item;
    if (pickable && !this.engine.portrait) {
      await this.walk.flyTo(st);
      this.showItem({ type: 'exhibit', note: st.note, item: st.item });
    } else {
      this.sheet.close();
      await this.walk.flyTo(st);
      if (pickable) toast(st.label, `${st.note.city} · ${STATUS[st.note.status].label} · 点画看详情`);
      else if (st.type === 'guestbook') toast('留言墙', '点一下木板，也留一句');
      else if (st.type === 'souvenir') toast('纪念品车', '点一下，把这场展做成票根分享出去');
      else if (st.note) toast(st.label, `${st.note.opensIn} 天后开幕 · 点倒计时设置提醒`);
    }
  }
  updateTourUi() {
    if (!this.tourEl) return;
    this.tourEl.querySelector('.count').innerHTML = this.tourI === undefined ? `<b>${this.tour.length}</b> 站导览` : `<b>${this.tourI + 1}</b> / ${this.tour.length}`;
    this.tourEl.querySelector('.go').textContent = this.tourI === undefined ? '开始导览 →' : '下一站 →';
  }

  ui() {
    const d = this.data;
    const top = mount(`<header class="topbar">
      <button class="pill" data-back>← 岛岛</button>
      <div class="title-chip"><b>${esc(d.title)}</b><small><span class="dot"></span><span class="hall-name">序厅</span></small></div>
      <div class="right">${this.from ? '<button class="pill" data-make>我也做一个</button>' : ''}<button class="pill red" data-share>分享</button></div></header>`);
    top.querySelector('[data-back]').onclick = () => { location.hash = this.from ? `#/?from=${encodeURIComponent(this.from)}` : '#/'; };
    top.querySelector('[data-share]').onclick = () => this.share();
    top.querySelector('[data-make]')?.addEventListener('click', () => toast('选一个你的专辑，就能生成自己的世界', 'Demo 中这一步暂未开放'));
    this.hallNameEl = top.querySelector('.hall-name'); this.hallDotEl = top.querySelector('.dot');
    const nav = mount(`<nav class="halls">${this.halls.map((h, i) => `<button data-h="${h.id}"><i style="background:${h.dot}">${i || '序'}</i>${esc(h.name)}</button>`).join('')}</nav>`);
    nav.addEventListener('click', e => {
      const b = e.target.closest('[data-h]'); if (!b) return;
      this.goHall(b.dataset.h);
    });
    this.navEl = nav;
    this.sheet = sheet();
    this.tourEl = mount(`<div class="tour"><button data-prev aria-label="上一站">‹</button><span class="count"></span><button class="go" data-next></button></div>`);
    this.tourEl.querySelector('[data-next]').onclick = () => this.goTour(this.tourI === undefined ? 0 : this.tourI + 1);
    this.tourEl.querySelector('[data-prev]').onclick = () => this.goTour(this.tourI === undefined ? this.tour.length - 1 : this.tourI - 1);
    this.updateTourUi();
    this.hintApi = hint(this.engine.mobile ? '点地面走过去 · 拖动环顾 · 点画看详情' : 'WASD / 方向键走动 · 拖动环顾 · 点画看详情');
    if (this.from) welcome({ from: this.from, title: d.title, sub: `TA 收藏过的 ${d.stats.total} 场展，${d.stats.cities} 座城市。<br>错过的、还能去的、快开幕的，都挂在这里了。`, go: '走进展厅' });
    else if (this.resume && this.mem.hallName) toast(`欢迎回来，上次你停在「${this.mem.hallName}」`, `看过 ${(this.mem.seen || []).length} 件`);
  }

  entered() { this.setHall(this.currentHall(), true); }

  currentHall() { const z = this.walk.pos.z; return this.halls.find(h => z <= h.z0 && z > h.z1) || this.halls[0]; }
  setHall(h, quiet) {
    if (this.hall === h) return;
    this.hall = h;
    this.hallNameEl.textContent = h.name; this.hallDotEl.style.background = h.dot;
    this.navEl.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.h === h.id));
    if (!quiet && h.id !== 'lobby') banner(h.name, h.line);
    this.mem = memory.set(this.data.id, { hallName: h.name });
  }

  update(dt, t) {
    this.walk.update(dt);
    const open = this.sheet.isOpen, portrait = this.engine.portrait;
    this.engine.shift(open && !portrait ? 200 / innerWidth : 0, open && portrait ? 0.29 : 0);
    const pos = this.walk.pos;
    const h = this.currentHall();
    if (h !== this.hall) this.setHall(h);
    // 跟着所在展厅调整光线（错过的展更暗）
    const target = this.hall?.light ?? 1.4;
    this.hemi.intensity += (target - this.hemi.intensity) * Math.min(1, dt * 2);
    this.sun.intensity = this.hemi.intensity * 1.05;
    this.sun.position.set(pos.x + 4, 14, pos.z + 6); this.sun.target.position.set(pos.x, 0, pos.z - 2);
    for (const o of this.anim) o.userData.update?.(t);
    for (const v of this.beans) {
      const d = Math.hypot(v.b.position.x - pos.x, v.b.position.z - pos.z);
      const want = d < 4.8 ? 1 : 0;
      v.bub.material.opacity += (want - v.bub.material.opacity) * Math.min(1, dt * 4);
      v.bub.visible = v.bub.material.opacity > 0.02;
      v.bub.position.y = (v.y || 1.48) + Math.sin(t * 2 + v.b.position.x) * 0.03;
    }
    this.saveT = (this.saveT || 0) + dt;
    if (this.saveT > 2) { this.saveT = 0; memory.set(this.data.id, { pos: { x: +pos.x.toFixed(2), z: +pos.z.toFixed(2), yaw: +this.walk.yaw.toFixed(2) } }); }
  }

  dispose() {
    this.walk.dispose();
    this.engine.canvas.style.cursor = '';
    disposeScene(this.scene);
  }
}
