// 岛岛：每个专辑是岛上的一栋建筑（博物馆 / 日记本 / 小屋 / 小街 / 舞台），一列小火车绕岛行驶
// 新岛主：先授权专辑、起称呼，再看着房子一栋栋“捏”出来；没授权的专辑是一块空地，点一下就能补授权
// 交互：拖动旋转、点建筑看专辑卡片、进入世界；点岛岛换一句话；分享整座岛
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { C, clay, mesh, rbox, rboxGeo, sphereGeo, cylGeo, blobGeo, prismGeo, noise3, bean, cactus, flower, tree, cloud, skyTexture, framed, sign } from '../core/clay.js';
import { labelTexture, billboard, bubbleTexture } from '../core/text.js';
import { disposeScene, ease } from '../core/engine.js';
import { daodao } from '../core/mascot.js';
import { profile } from '../core/profile.js';
import { mount, esc, toast, hint, shareModal, welcome, memory } from '../ui/overlay.js';
import { onboarding } from '../ui/onboarding.js';

const R = 5.3;                                          // 建筑所在的圆环半径
const SPOT = { monet: 98, grow: 28, room: -42, kyoto: -122, live: 166 };   // 角度（度）
const READY = new Set(['monet', 'grow']);
const WORLD = { monet: '博物馆', grow: '日记本', room: '小屋', kyoto: '小街', live: '舞台' };
const BLURB = {
  monet: '12 场收藏过的展，变成一座按“错过 / 还能去 / 即将开幕”布展的博物馆。',
  grow: '12 篇自我成长笔记，装订成书桌上的一本日记：有封面、目录，每一篇都能打勾、能回信。',
  room: '12 个出租屋改造案例，正在搭成一间能拉灯切换“改造前 / 后”的小屋。',
  kyoto: '12 篇京都攻略，正在铺成一条可以慢慢走、沿途盖章的小街。',
  live: '12 篇演唱会出片攻略，正在布置成一个出发前的后台。',
};
const MASCOT = new THREE.Vector3(-0.45, 0.47, 0.7);
const backOut = t => { const c = 2.2; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };

export class Island {
  constructor(engine, { albums, from, lines = [], fresh }) {
    this.engine = engine; this.albums = albums; this.from = from; this.lines = lines;
    this.prof = from ? null : profile.get();
    this.onboard = !from && (!this.prof || fresh);
    this.owner = from || this.prof?.name || '岛民';
    this.authorized = new Set(from ? albums.map(a => a.id) : this.onboard ? [] : (this.prof.albums || []));
    this.anim = []; this.buildingsById = {}; this.plotsById = {}; this.puffs = [];
    this.lineI = 0; this.lineT = 0;
  }
  fov(portrait) { return portrait ? 46 : 34; }
  get envIntensity() { return 0.3; }

  async build() {
    const s = this.scene = new THREE.Scene();
    s.background = skyTexture('#38B2F2', '#D2F0FF');
    s.fog = new THREE.Fog('#CFEFFF', 60, 120);
    s.add(new THREE.HemisphereLight('#FFFFFF', '#D8B98A', 1.05));
    const sun = this.sun = new THREE.DirectionalLight('#FFF0DA', 2.4);
    sun.position.set(9, 18, 10);
    sun.castShadow = true;
    const sm = this.engine.mobile ? 1024 : 2048;
    sun.shadow.mapSize.set(sm, sm);
    Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 50 });
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
    s.add(sun);

    this.ground();
    await this.buildings();
    this.decor();
    this.guide();
    this.train();
    this.sky();
    this.controls();
    this.ui();
    window.__island = this;
  }

  // 走查用：某栋建筑在屏幕上的像素位置
  screenOf(id) {
    const b = this.buildingsById[id]?.visible ? this.buildingsById[id] : this.plotsById[id]; if (!b) return null;
    const v = b.position.clone().setY(1.3).project(this.engine.camera);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
  }

  // ---------- 小岛本体：草地顶 + 黏土悬崖 ----------
  ground() {
    const s = this.scene;
    const lathe = (pts, color, wobble) => {
      const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 96);
      if (wobble) {
        const p = g.attributes.position, v = new THREE.Vector3();
        for (let i = 0; i < p.count; i++) {
          v.fromBufferAttribute(p, i);
          const r = Math.hypot(v.x, v.z); if (r < 0.01) continue;
          const a = Math.atan2(v.z, v.x);
          const k = 1 + wobble * noise3(Math.cos(a) * 2.2, v.y * 0.7, Math.sin(a) * 2.2);
          p.setXYZ(i, v.x * k, v.y, v.z * k);
        }
        g.computeVertexNormals();
      }
      return mesh(g, clay(color, { repeat: 10, bump: 2.2, side: THREE.DoubleSide }));
    };
    s.add(lathe([[0, -6.2], [1.2, -5.9], [2.8, -5.1], [4.7, -4.1], [6.5, -2.9], [7.9, -1.8], [8.75, -0.85], [9.05, -0.2]], C.sand, 0.07));
    s.add(lathe([[0, -6.0], [2.3, -5.3]], C.brown, 0));
    const grass = lathe([[9.0, -0.3], [9.12, 0.02], [8.9, 0.27], [8.4, 0.36], [0, 0.36]], C.grass, 0.012);
    s.add(grass);
    // 中央小广场
    s.add(mesh(cylGeo(1.7, 1.75, 0.14, 48), clay(C.cream, { repeat: 4 }), { y: 0.4 }));
    s.add(mesh(cylGeo(1.15, 1.15, 0.05, 48), clay(C.lemon, { repeat: 4 }), { y: 0.49 }));
    // 通往每栋建筑的石板路
    for (const deg of Object.values(SPOT)) {
      const a = deg * Math.PI / 180;
      for (let i = 0; i < 3; i++) {
        const r = 2.2 + i * 0.85;
        s.add(mesh(blobGeo(0.32, 0.12, i + deg), clay(C.stone, { repeat: 2 }), { x: Math.cos(a) * r + (i % 2 ? 0.12 : -0.1), y: 0.38, z: Math.sin(a) * r, sy: 0.18 }));
      }
    }
    // 路牌：四个方向的小箭头
    const post = new THREE.Group();
    post.add(mesh(cylGeo(0.07, 0.08, 2.3, 12), clay(C.wood), { y: 1.55 }));
    post.add(mesh(sphereGeo(0.14, 16, 12), clay(C.red), { y: 2.75 }));
    const arrows = [['博物馆', 'monet', C.pink], ['日记本', 'grow', C.yellow], ['小屋', 'room', C.coral], ['小街', 'kyoto', C.mint]];
    arrows.forEach(([name, id, color], i) => {
      const a = SPOT[id] * Math.PI / 180;
      const board = sign([{ t: name + ' →', size: 52, weight: 900, color: '#26242E' }], { w: 0.95, h: 0.28, color, px: 300, align: 'center', pad: 14, valign: 'middle' });
      board.children[1].position.z = 0.065; // 文字贴在板子正面
      const arm = new THREE.Group();
      arm.add(board); board.position.set(0.45, 0, 0);
      arm.position.y = 1.35 + i * 0.32;
      arm.rotation.y = -a;
      post.add(arm);
    });
    post.position.set(0.55, 0.36, -0.35);
    s.add(post);
  }

  // ---------- 五栋建筑 + 未授权专辑的空地 ----------
  async buildings() {
    const tex = await Promise.all([
      this.engine.loadTexture('assets/covers/monet.jpg', 512),
      this.engine.loadTexture('assets/monet/3-3.jpg', 512),
    ]);
    const makers = { monet: () => this.museum(tex), grow: () => this.diary(), room: () => this.room(), kyoto: () => this.street(), live: () => this.stage() };
    for (const a of this.albums) {
      const ang = SPOT[a.id] * Math.PI / 180;
      const pos = new THREE.Vector3(Math.cos(ang) * R, 0.36, Math.sin(ang) * R);
      const g = makers[a.id]();
      g.position.copy(pos);
      g.rotation.y = Math.PI / 2 - ang;
      g.userData.album = a;
      const ready = READY.has(a.id);
      const label = billboard(labelTexture(a.name, ready ? `${WORLD[a.id]} · ${a.count} 篇收藏` : `${WORLD[a.id]} · 正在捏…`, { accent: ready ? C.red : '#9A96A3' }), this.engine.portrait ? 1.15 : 0.8);
      label.position.set(0, 3.55, 0);
      g.add(label);
      g.userData.label = label;
      if (!ready) {
        const worker = bean({ color: [C.mint, C.lilac, C.orange, C.sky][Object.keys(SPOT).indexOf(a.id) % 4], h: 0.75, r: 0.24, accessory: 'cap', seed: ang * 3 });
        worker.position.set(1.55, 0, 1.0); worker.rotation.y = -0.6;
        g.add(worker); this.anim.push(worker);
        g.add(mesh(cylGeo(0.02, 0.17, 0.4, 16), clay(C.orange), { x: -1.5, y: 0.2, z: 1.2 }));
        g.add(mesh(cylGeo(0.13, 0.15, 0.06, 16), clay(C.white), { x: -1.5, y: 0.22, z: 1.2 }));
      }
      g.visible = this.authorized.has(a.id);
      this.scene.add(g);
      this.buildingsById[a.id] = g;
      const plot = this.plot(a);
      plot.position.copy(pos); plot.rotation.y = g.rotation.y;
      plot.visible = !g.visible && !this.onboard;
      this.scene.add(plot);
      this.plotsById[a.id] = plot;
    }
  }

  // 空地：一块翻过的土 + 木牌，表示这个专辑还没授权上岛
  plot(a) {
    const g = new THREE.Group();
    g.add(mesh(blobGeo(1.3, 0.1, 7), clay('#C99A6A', { repeat: 4, bump: 2.6 }), { y: 0.02, sy: 0.08, cast: false }));
    for (let i = 0; i < 5; i++) g.add(mesh(blobGeo(0.14, 0.2, i), clay('#B5835A', { repeat: 2 }), { x: Math.cos(i * 1.3) * 0.7, y: 0.08, z: Math.sin(i * 1.3) * 0.6, sy: 0.6 }));
    const board = sign([{ t: '待上岛', size: 58, weight: 900, color: '#26242E' }, { t: a.album, size: 34, color: '#6B6875' }], { w: 1.15, h: 0.5, color: C.cream, px: 280, align: 'center', pad: 14, valign: 'middle' });
    board.position.set(0, 1.0, 0.1); board.rotation.x = -0.12;
    g.add(board);
    g.add(mesh(cylGeo(0.05, 0.06, 1.0, 8), clay(C.wood), { y: 0.5, z: 0.05 }));
    g.add(mesh(cylGeo(0.015, 0.015, 0.9, 6), clay('#8D8A99'), { x: 0.8, y: 0.45, z: -0.3 }));
    g.add(mesh(prismGeo(0.36, 0.26, 0.03, 0.01), clay(C.red), { x: 0.98, y: 0.78, z: -0.3, rz: -Math.PI / 2 }));
    g.userData.album = a; g.userData.isPlot = true;
    return g;
  }

  museum([cover, lily]) {
    const g = new THREE.Group();
    g.add(rbox(3.7, 0.3, 3.0, C.stone, { y: 0.15 }));
    g.add(rbox(3.1, 1.75, 2.2, C.pink, { y: 0.3 + 0.87, z: -0.2 }));
    for (const x of [-1.15, -0.4, 0.4, 1.15]) {
      g.add(mesh(cylGeo(0.15, 0.17, 1.7, 20), clay(C.cream), { x, y: 0.3 + 0.85, z: 1.25 }));
      g.add(rbox(0.42, 0.12, 0.42, C.cream, { x, y: 0.36, z: 1.25 }));
    }
    g.add(rbox(3.5, 0.24, 2.9, C.cream, { y: 2.15, z: 0.05 }));
    g.add(mesh(prismGeo(3.5, 0.85, 0.5, 0.07), clay(C.red), { y: 2.26, z: 1.25 }));
    g.add(mesh(new THREE.SphereGeometry(0.85, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2), clay(C.sky), { y: 2.26, z: -0.3 }));
    g.add(mesh(sphereGeo(0.16, 16, 12), clay(C.yellow), { y: 3.15, z: -0.3 }));
    g.add(rbox(0.8, 1.1, 0.12, '#7A4B3A', { y: 0.86, z: 0.92 }));
    g.add(rbox(1.0, 0.12, 0.6, C.stone, { y: 0.06, z: 1.75 }));
    const p1 = framed(cover, 0.5, 0.66, { color: C.yellow, border: 0.06, depth: 0.06 });
    p1.position.set(-0.98, 1.18, 0.9); g.add(p1);
    const p2 = framed(lily, 0.62, 0.47, { color: C.sky, border: 0.06, depth: 0.06 });
    p2.position.set(0.98, 1.22, 0.9); g.add(p2);
    return g;
  }

  diary() {
    const g = new THREE.Group();
    g.add(rbox(3.0, 0.16, 2.6, C.sand, { y: 0.08 }));
    for (const sx of [-1, 1]) {
      g.add(rbox(2.35, 0.16, 2.3, C.yellow, { x: sx * 0.66, y: 1.05, rz: sx * -0.98, mat: { repeat: 3 } }));
      g.add(rbox(2.2, 0.14, 2.15, C.paper, { x: sx * 0.55, y: 0.98, rz: sx * -0.98, mat: { bump: 0.6 } }));
    }
    g.add(rbox(0.12, 0.9, 0.06, C.red, { y: 1.55, z: 1.1, rz: 0.08 }));      // 书签带
    g.add(rbox(0.1, 2.0, 0.08, C.red, { x: 0.95, y: 1.0, z: 1.18, rz: -0.98 })); // 橡皮筋
    g.add(mesh(sphereGeo(0.22, 20, 14), clay(C.lemon, { emissive: '#FFD86B', ei: 1.4 }), { y: 0.55, z: 0.2 }));
    const pen = new THREE.Group();
    pen.add(mesh(cylGeo(0.13, 0.13, 2.1, 6), clay(C.orange), { y: 1.05 }));
    pen.add(mesh(cylGeo(0.13, 0.13, 0.22, 16), clay(C.pink), { y: 2.2 }));
    pen.add(mesh(cylGeo(0.13, 0.02, 0.36, 6), clay(C.sand), { y: -0.18, rx: Math.PI }));
    pen.position.set(1.55, 0.25, 0.4); pen.rotation.z = 0.32;
    g.add(pen);
    return g;
  }

  room() {
    const g = new THREE.Group();
    g.add(rbox(2.7, 0.2, 2.4, C.stone, { y: 0.1 }));
    g.add(rbox(2.3, 1.55, 1.9, C.cream, { y: 0.2 + 0.77 }));
    g.add(mesh(prismGeo(2.75, 1.05, 2.25, 0.08), clay(C.coral), { y: 1.72 }));
    g.add(rbox(0.3, 0.6, 0.3, C.brown, { x: 0.65, y: 2.25, z: -0.35 }));
    g.add(rbox(0.66, 0.6, 0.1, C.lemon, { x: -0.5, y: 1.1, z: 0.95, mat: { emissive: '#FFD46B', ei: 0.9 } }));
    g.add(rbox(0.66, 0.06, 0.12, C.white, { x: -0.5, y: 1.1, z: 1.0 }));
    g.add(rbox(0.06, 0.6, 0.12, C.white, { x: -0.5, y: 1.1, z: 1.0 }));
    g.add(rbox(0.75, 0.16, 0.22, C.wood, { x: -0.5, y: 0.73, z: 1.05 }));
    for (let i = 0; i < 4; i++) { const f = flower([C.pink, C.yellow, C.red, C.lilac][i], 0.18, i); f.position.set(-0.78 + i * 0.18, 0.8, 1.05); f.scale.setScalar(0.8); g.add(f); }
    g.add(rbox(0.62, 1.0, 0.1, C.mint, { x: 0.55, y: 0.7, z: 0.95 }));
    g.add(mesh(sphereGeo(0.05, 10, 8), clay(C.yellow), { x: 0.75, y: 0.7, z: 1.02 }));
    return g;
  }

  street() {
    const g = new THREE.Group();
    g.add(rbox(2.9, 0.16, 2.6, C.stone, { y: 0.08 }));
    for (const x of [-0.85, 0.85]) g.add(mesh(cylGeo(0.11, 0.14, 2.0, 16), clay(C.red), { x, y: 1.1, z: 0.9 }));
    g.add(rbox(2.45, 0.17, 0.32, '#3B3540', { y: 2.12, z: 0.9 }));
    g.add(rbox(2.15, 0.14, 0.24, C.red, { y: 1.95, z: 0.9 }));
    g.add(rbox(1.9, 0.12, 0.18, C.red, { y: 1.6, z: 0.9 }));
    const tiers = [[1.05, 0.5, C.cream], [0.82, 0.45, C.cream], [0.62, 0.4, C.cream]];
    let y = 0.16;
    tiers.forEach(([w, h, col]) => {
      g.add(rbox(w, h, w, col, { y: y + h / 2, z: -0.55 }));
      y += h;
      g.add(rbox(w + 0.55, 0.13, w + 0.55, '#3B3540', { y: y + 0.03, z: -0.55, r: 0.06 }));
      y += 0.1;
    });
    g.add(mesh(cylGeo(0.03, 0.05, 0.6, 8), clay(C.yellow), { y: y + 0.28, z: -0.55 }));
    g.add(mesh(cylGeo(0.17, 0.17, 0.36, 20), clay(C.red, { emissive: '#FF5A3A', ei: 0.6 }), { x: 1.15, y: 0.55, z: 0.5 }));
    g.add(mesh(cylGeo(0.12, 0.12, 0.05, 16), clay('#3B3540'), { x: 1.15, y: 0.76, z: 0.5 }));
    const maple = tree({ h: 1.5, color: C.orange, seed: 4 }); maple.position.set(-1.25, 0.1, -0.3); maple.scale.setScalar(0.75); g.add(maple);
    return g;
  }

  stage() {
    const g = new THREE.Group();
    g.add(rbox(3.2, 0.42, 2.3, C.indigo, { y: 0.21 }));
    g.add(mesh(new THREE.SphereGeometry(1.55, 40, 20, Math.PI, Math.PI, 0, Math.PI / 2), clay(C.lilac, { side: THREE.DoubleSide }), { y: 0.42, z: -0.2 }));
    const bulbs = [C.yellow, C.pink, C.sky, C.mint];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10 * Math.PI;
      g.add(mesh(sphereGeo(0.07, 10, 8), clay(bulbs[i % 4], { emissive: bulbs[i % 4], ei: 1.2 }), { x: Math.cos(t) * 1.58, y: 0.42 + Math.sin(t) * 1.58, z: -0.15, cast: false }));
    }
    for (const x of [-1.3, 1.3]) {
      g.add(rbox(0.5, 0.82, 0.45, C.ink, { x, y: 0.42 + 0.41, z: 0.75 }));
      g.add(mesh(cylGeo(0.14, 0.14, 0.04, 20), clay('#57536A'), { x, y: 0.95, z: 0.99, rx: Math.PI / 2 }));
    }
    g.add(mesh(cylGeo(0.02, 0.02, 1.0, 8), clay('#9A96A3'), { y: 0.92, z: 0.45 }));
    g.add(mesh(sphereGeo(0.07, 12, 10), clay(C.ink), { y: 1.45, z: 0.45 }));
    g.add(rbox(0.9, 0.3, 0.08, C.red, { y: 2.2, z: -0.1, mat: { emissive: C.red, ei: 0.4 } }));
    return g;
  }

  // ---------- 树、仙人掌、花 ----------
  decor() {
    const s = this.scene;
    const place = (o, deg, r, sc = 1) => { const a = deg * Math.PI / 180; o.position.set(Math.cos(a) * r, 0.36, Math.sin(a) * r); o.scale.setScalar(sc); s.add(o); return o; };
    [[62, 6.5, C.green], [-5, 6.7, C.leaf], [-80, 6.4, C.green], [140, 6.6, C.leaf], [-155, 6.5, C.green], [-100, 3.0, C.green]].forEach(([d, r, c], i) => place(tree({ color: c, seed: i + 1, h: 2 + (i % 3) * 0.3 }), d, r, 0.95));
    [[48, 3.6], [-60, 3.4], [130, 3.2], [205, 6.8]].forEach(([d, r], i) => place(cactus({ h: 1 + (i % 2) * 0.4 }), d, r, 0.7));
    const fc = [C.pink, C.yellow, C.red, C.lilac, C.white, C.orange];
    for (let i = 0; i < 70; i++) {
      const d = (i * 137.5) % 360, r = 2.2 + ((i * 53) % 47) / 47 * 4.6;
      const near = Object.values(SPOT).some(sd => Math.abs(((d - sd + 540) % 360) - 180) < 20 && r > 3.6);
      if (near) continue;
      place(flower(fc[i % fc.length], 0.28 + (i % 3) * 0.08, i), d, r, 0.9);
    }
    for (let i = 0; i < 14; i++) place(mesh(blobGeo(0.3, 0.2, i), clay(i % 2 ? C.green : C.leaf, { repeat: 2, bump: 2 }), { y: 0.1, sy: 0.7 }), i * 26 + 7, 8.2 - (i % 3) * 0.3, 0.9 + (i % 3) * 0.2);
  }

  // ---------- 广场中央的岛岛 + 会换的台词 ----------
  guide() {
    const m = this.mascot = daodao({ scale: 1.0 });
    m.position.copy(MASCOT); m.userData.baseY = MASCOT.y;
    this.scene.add(m);
    if (this.from) this.lines = [`欢迎来${this.from}的岛岛！`, ...this.lines];
    else if (!this.onboard) this.lines = [`${this.owner}，欢迎回岛！`, ...this.lines];
    this.say(this.onboard ? '你好呀，我是岛岛！' : this.lines[0]);
  }

  say(text) {
    if (this.bubble) { this.scene.remove(this.bubble); this.bubble.material.map.dispose(); this.bubble.material.dispose(); }
    const b = this.bubble = billboard(bubbleTexture(text, { maxW: 640 }), 0.5);
    b.position.copy(MASCOT).add(new THREE.Vector3(0, 2.05, 0));
    b.userData.pop = 0;
    this.scene.add(b);
    this.lineT = 0;
  }
  nextLine() { this.lineI = (this.lineI + 1) % this.lines.length; this.say(this.lines[this.lineI]); }

  // ---------- 绕岛小火车 ----------
  train() {
    const s = this.scene, TR = 7.75;
    for (const r of [TR - 0.24, TR + 0.24]) s.add(mesh(new THREE.TorusGeometry(r, 0.045, 8, 160), clay('#8D8A99'), { y: 0.42, rx: Math.PI / 2, cast: false }));
    const sleepers = new THREE.InstancedMesh(rboxGeo(0.72, 0.07, 0.2, 0.03), clay(C.wood), 110);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0; i < 110; i++) {
      const a = i / 110 * Math.PI * 2;
      q.setFromEuler(e.set(0, -a, 0));
      m.compose(new THREE.Vector3(Math.cos(a) * TR, 0.38, Math.sin(a) * TR), q, new THREE.Vector3(1, 1, 1));
      sleepers.setMatrixAt(i, m);
    }
    sleepers.receiveShadow = true;
    s.add(sleepers);
    const colors = [C.red, C.pink, C.red];
    this.cars = colors.map((col, i) => {
      const car = new THREE.Group();
      car.add(rbox(1.3, 0.78, 0.78, col, { y: 0.62, r: 0.3 }));
      car.add(rbox(1.36, 0.14, 0.84, C.cream, { y: 0.48, r: 0.06 }));
      for (const z of [-0.4, 0.4]) for (const x of [-0.28, 0.28]) {
        car.add(rbox(0.36, 0.3, 0.05, C.lemon, { x, y: 0.78, z, mat: { emissive: '#FFE07A', ei: 0.35 }, cast: false }));
      }
      for (const x of [-0.42, 0.42]) for (const z of [-0.36, 0.36]) car.add(mesh(cylGeo(0.12, 0.12, 0.08, 16), clay(C.ink), { x, y: 0.3, z, rx: Math.PI / 2 }));
      if (i === 0) {
        car.add(mesh(sphereGeo(0.39, 24, 16), clay(col), { x: 0.62, y: 0.62, sz: 1, sx: 0.7 }));
        car.add(mesh(sphereGeo(0.09, 12, 10), clay(C.lemon, { emissive: '#FFE07A', ei: 1 }), { x: 0.9, y: 0.62 }));
        car.add(mesh(sphereGeo(0.2, 18, 12), clay(C.mint), { x: 0.1, y: 1.12, sx: 1.15, sy: 0.9 }));
      }
      const pass = bean({ color: [C.yellow, C.sky, C.white][i], h: 0.5, r: 0.17, seed: i * 2 });
      pass.position.set(0.1, 0.7, 0.32); pass.rotation.y = 0.2;
      car.add(pass); this.anim.push(pass);
      car.scale.setScalar(0.92);
      s.add(car);
      return car;
    });
    this.trainA = 0.6;
    this.TR = TR;
  }

  sky() {
    this.clouds = [];
    const spots = [[-14, 6, -10, 1.6], [13, 7.5, -12, 2], [17, 3.5, 6, 1.4], [-17, 2.5, 7, 1.7], [-6, 9, -18, 2.2], [8, -4, 12, 2.4], [-11, -5, -4, 2], [20, 10, -2, 1.3], [-21, 8, -6, 1.4]];
    spots.forEach(([x, y, z, sc], i) => {
      const c = cloud(i + 1); c.position.set(x, y, z); c.scale.multiplyScalar(sc);
      c.userData.r = Math.hypot(x, z); c.userData.a = Math.atan2(z, x); c.userData.y = y; c.userData.sp = 0.012 + (i % 3) * 0.006;
      this.scene.add(c); this.clouds.push(c);
    });
  }

  // ---------- 相机与交互 ----------
  controls() {
    const cam = this.engine.camera, dom = this.engine.canvas;
    const oc = this.orbit = new OrbitControls(cam, dom);
    oc.target.set(0, 0.9, 0);
    oc.enablePan = false; oc.enableDamping = true; oc.dampingFactor = 0.08;
    oc.minPolarAngle = 0.55; oc.maxPolarAngle = 1.22;
    oc.minDistance = 16; oc.maxDistance = 62;
    oc.rotateSpeed = 0.6; oc.zoomSpeed = 0.7;
    oc.autoRotate = !this.onboard; oc.autoRotateSpeed = 0.45;
    oc.enabled = !this.onboard;
    oc.addEventListener('start', () => { oc.autoRotate = false; clearTimeout(this.idle); this.hintApi?.hide(); });
    oc.addEventListener('end', () => { clearTimeout(this.idle); this.idle = setTimeout(() => { if (!this.selected) oc.autoRotate = true; }, 9000); });
    if (this.onboard) this.closeUp(); else this.placeCamera(true);

    this.ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let down = null;
    const toNdc = e => { const r = dom.getBoundingClientRect(); return ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); };
    this._down = e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; };
    this._up = e => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 7 || performance.now() - down.t > 500) { down = null; return; }
      down = null;
      const h = this.hit(toNdc(e));
      if (h === this.mascot) { this.mascot.userData.jump(); this.nextLine(); return; }
      if (this.locked) return;
      if (h) this.select(h); else this.deselect();
    };
    this._move = e => { if (e.pointerType !== 'mouse' || down) return; const b = this.hit(toNdc(e)); dom.style.cursor = b ? 'pointer' : 'grab'; this.hover = b; };
    dom.addEventListener('pointerdown', this._down);
    dom.addEventListener('pointerup', this._up);
    dom.addEventListener('pointermove', this._move);
  }

  overview() {
    const sph = new THREE.Spherical(this.engine.portrait ? 46 : 31, 1.02, 0.32);
    return new THREE.Vector3().setFromSpherical(sph).add(this.orbit.target);
  }
  placeCamera(intro) {
    const cam = this.engine.camera, to = this.overview();
    cam.position.copy(to);
    if (intro) { this.intro = { t: 0, from: to.clone().multiplyScalar(1.5).setY(to.y * 2.2), to, fromT: this.orbit.target.clone(), toT: this.orbit.target.clone() }; cam.position.copy(this.intro.from); }
    cam.lookAt(this.orbit.target);
  }
  // 引导时镜头凑近岛岛；桌面上把它让到弹窗左边，手机上让到弹窗上面
  closeUp() {
    const cam = this.engine.camera, portrait = this.engine.portrait;
    const t = MASCOT.clone().add(new THREE.Vector3(0, portrait ? 1.2 : 1.0, 0));
    cam.position.copy(t).add(new THREE.Vector3(Math.sin(0.12), 0.4, Math.cos(0.12)).normalize().multiplyScalar(portrait ? 13 : 7.5));
    cam.lookAt(t);
    this.orbit.target.copy(t);
    this.engine.shift(portrait ? 0 : 0.17, portrait ? 0.25 : 0);
  }

  hit(ndc) {
    this.ray.setFromCamera(ndc, this.engine.camera);
    const targets = [this.mascot, ...Object.values(this.buildingsById), ...Object.values(this.plotsById)].filter(o => o.visible);
    const h = this.ray.intersectObjects(targets, true)[0];
    if (!h) return null;
    let o = h.object; while (o && !o.userData.album && o !== this.mascot) o = o.parent;
    return o;
  }

  select(b) {
    this.selected = b;
    this.orbit.autoRotate = false;
    b.userData.bounce = 1;
    const a = b.userData.album, card = this.card;
    card.querySelector('img').src = a.cover.src;
    if (b.userData.isPlot) {
      card.querySelector('.kind').textContent = `还没上岛 · 专辑「${a.album}」· ${a.count} 篇`;
      card.querySelector('h3').textContent = `把它变成${WORLD[a.id]}？`;
      card.querySelector('p').textContent = `授权后，这个专辑会在这块空地上捏成「${a.name}」。`;
      card.querySelector('.row').innerHTML = this.from ? '' : '<button class="pill red" data-auth>授权上岛</button>';
    } else {
      const ready = READY.has(a.id), mem = memory.get(a.id);
      card.querySelector('.kind').textContent = `${WORLD[a.id]} · ${a.count} 篇收藏 · 来自专辑「${a.album}」`;
      card.querySelector('h3').textContent = a.name;
      card.querySelector('p').innerHTML = esc(BLURB[a.id]) + (ready && mem.visits && !this.from ? `<br><b style="color:#26242E">${this.recap(a.id, mem)}</b>` : '');
      const resume = !this.from && (mem.pos || mem.spread > 0);
      card.querySelector('.row').innerHTML = ready
        ? `<button class="pill red" data-enter>走进去 →</button>${resume ? '<button class="pill ghost" data-resume>从上次继续</button>' : ''}<button class="pill ghost" data-share>分享</button>`
        : `<button class="pill ghost" data-wait>正在捏，催一下 👋</button>`;
    }
    card.classList.add('open');
  }
  recap(id, mem) {
    if (id === 'grow') {
      const done = Object.values(mem.checks || {}).flat().filter(Boolean).length, replies = Object.values(mem.replies || {}).filter(Boolean).length;
      return `你翻开过 ${mem.visits} 次，勾掉了 ${done} 件小事${replies ? `，写了 ${replies} 封回信` : ''}`;
    }
    return `你来过 ${mem.visits} 次${mem.hallName ? `，上次停在「${esc(mem.hallName)}」` : ''}${mem.seen?.length ? `，看过 ${mem.seen.length} 件` : ''}`;
  }
  deselect() { this.selected = null; this.card.classList.remove('open'); }

  async enter(a, resume) {
    const b = this.buildingsById[a.id];
    this.card.classList.remove('open');
    this.orbit.enabled = false; this.orbit.autoRotate = false;
    const cam = this.engine.camera, from = cam.position.clone(), fromT = this.orbit.target.clone();
    const out = b.position.clone().setY(0).normalize();
    const toT = b.position.clone().setY(1.3), to = b.position.clone().add(out.multiplyScalar(6)).setY(3);
    await this.tween(900, k => { cam.position.lerpVectors(from, to, k); this.orbit.target.lerpVectors(fromT, toT, k); cam.lookAt(this.orbit.target); });
    const q = new URLSearchParams();
    if (resume) q.set('resume', 1);
    if (this.from) q.set('from', this.from);
    location.hash = `#/w/${a.id}${q.toString() ? '?' + q : ''}`;
  }
  tween(ms, fn) {
    const t0 = performance.now();
    return new Promise(done => { const step = () => { const k = ease(Math.min(1, (performance.now() - t0) / ms)); fn(k); k < 1 ? requestAnimationFrame(step) : done(); }; step(); });
  }

  // ---------- 建岛：房子一栋栋捏出来 ----------
  pop(id, delay = 0) {
    const b = this.buildingsById[id], p = this.plotsById[id];
    b.userData.pop = { t: -delay };
    p.userData.popOut = { t: -delay };
  }
  puff(pos) {
    const g = new THREE.Group(); g.position.copy(pos);
    const mat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 1, transparent: true, opacity: 0.95 });
    mat.userData.own = true;
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2;
      const m = mesh(blobGeo(0.42, 0.18, i), mat, { x: Math.cos(a) * 0.8, y: 0.3 + (i % 3) * 0.2, z: Math.sin(a) * 0.8, cast: false });
      m.userData.dir = new THREE.Vector3(Math.cos(a), 0.25, Math.sin(a));
      g.add(m);
    }
    g.userData.t = 0; g.userData.mat = mat;
    this.scene.add(g); this.puffs.push(g);
  }

  async startOnboarding() {
    this.locked = true;
    this.mascot.userData.wave(3);
    const ask = setTimeout(() => this.say('先告诉我，怎么称呼你？'), 1800);
    const res = await onboarding({ albums: this.albums, onStep: (step, name) => { clearTimeout(ask); this.subEl.textContent = step === 2 ? '选好要上岛的专辑' : '先起个名字吧'; this.mascot.userData.jump(); this.say(step === 2 ? `你好，${name}！哪些专辑可以上岛？` : '先告诉我，怎么称呼你？'); } });
    this.prof = profile.set({ name: res.name, albums: res.albums, createdAt: new Date().toISOString() });
    this.owner = res.name; this.onboard = false;
    this.titleEl.textContent = `${res.name}的岛岛`;
    this.engine.shift(0, 0);
    this.say(`好嘞，${res.name}！开始建岛～`);
    this.mascot.userData.jump();
    // 镜头拉远到全岛
    const cam = this.engine.camera, from = cam.position.clone(), fromT = this.orbit.target.clone(), toT = new THREE.Vector3(0, 0.9, 0);
    this.orbit.target.copy(toT); const to = this.overview(); this.orbit.target.copy(fromT);
    await this.tween(1600, k => { cam.position.lerpVectors(from, to, k); this.orbit.target.lerpVectors(fromT, toT, k); cam.lookAt(this.orbit.target); });
    const order = this.albums.filter(a => res.albums.includes(a.id));
    const chip = mount(`<div class="build-chip"><span class="t"></span><span class="bar"><i></i></span></div>`);
    for (const [i, a] of order.entries()) {
      chip.querySelector('.t').textContent = `正在把「${a.album}」捏成${WORLD[a.id]}…`;
      chip.querySelector('.bar i').style.width = `${(i + 1) / order.length * 100}%`;
      this.authorized.add(a.id);
      this.pop(a.id);
      this.refreshStats();
      this.mascot.userData.jump();
      await new Promise(r => setTimeout(r, 900));
    }
    for (const a of this.albums) if (!res.albums.includes(a.id)) this.plotsById[a.id].visible = true;
    chip.style.opacity = 0; setTimeout(() => chip.remove(), 500);
    this.lines = [`${res.name}，你的岛建好啦！`, ...this.lines];
    this.lineI = 0; this.say(this.lines[0]);
    this.refreshStats();
    toast(`${res.name}的岛岛建好啦`, `${order.length} 个专辑变成了 ${order.length} 个地方，点房子走进去`);
    this.topRight.hidden = false;
    this.locked = false;
    this.orbit.enabled = true; this.orbit.autoRotate = true;
    this.hintApi = hint(this.engine.mobile ? '拖动旋转小岛 · 点房子看看 · 点岛岛聊两句' : '拖动旋转小岛 · 滚轮缩放 · 点房子看看 · 点岛岛聊两句');
  }

  authorize(a) {
    this.deselect();
    this.authorized.add(a.id);
    this.prof = profile.set({ albums: [...this.authorized] });
    this.pop(a.id);
    this.mascot.userData.jump();
    this.say(`「${a.album}」上岛啦！`);
    this.refreshStats();
    toast(`「${a.album}」上岛了`, `变成了${WORLD[a.id]}「${a.name}」`);
  }

  entered() {
    if (this.onboard) this.startOnboarding();
  }

  ui() {
    const top = mount(`<header class="topbar">
      <div class="brand"><div class="logo">岛岛</div></div>
      <div class="title-chip"><b>${esc(this.onboard ? '欢迎上岛' : this.owner + '的岛岛')}</b><small></small></div>
      <div class="right" ${this.onboard ? 'hidden' : ''}><button class="pill red" data-share-island>分享小岛</button></div></header>`);
    this.titleEl = top.querySelector('.title-chip b'); this.subEl = top.querySelector('.title-chip small');
    this.topRight = top.querySelector('.right');
    top.querySelector('[data-share-island]').onclick = () => this.share();
    this.stats = mount('<div class="island-stats"></div>');
    this.stats.addEventListener('click', e => {
      if (!e.target.closest('[data-reset]')) return;
      profile.clear();
      if (location.hash === '#/?new=1') location.reload(); else location.hash = '#/?new=1';
    });
    this.refreshStats();
    this.card = mount(`<div class="album-card"><button class="x" aria-label="关闭">✕</button><img alt=""><div class="info"><div class="kind"></div><h3></h3><p></p><div class="row"></div></div></div>`);
    this.card.addEventListener('click', e => {
      const a = this.selected?.userData.album; if (!a) return;
      if (e.target.closest('.x')) this.deselect();
      if (e.target.closest('[data-enter]')) this.enter(a);
      if (e.target.closest('[data-resume]')) this.enter(a, true);
      if (e.target.closest('[data-share]')) this.share(a);
      if (e.target.closest('[data-auth]')) this.authorize(a);
      if (e.target.closest('[data-wait]')) { toast('已经催啦', `${a.name}会在下一版开放`); this.selected.userData.bounce = 1; }
    });
    if (!this.onboard) this.hintApi = hint(this.engine.mobile ? '拖动旋转小岛 · 点房子看看 · 点岛岛聊两句' : '拖动旋转小岛 · 滚轮缩放 · 点房子看看 · 点岛岛聊两句');
    const total = this.albums.reduce((s, a) => s + a.count, 0);
    if (this.from) welcome({ from: this.from, title: `${this.from}的岛岛`, sub: `TA 把 ${total} 篇小红书收藏，捏成了一座岛：<br>博物馆、日记本、小屋、小街和舞台。`, go: '上岛逛逛' });
  }

  refreshStats() {
    const on = this.albums.filter(a => this.authorized.has(a.id));
    const posts = on.reduce((s, a) => s + a.count, 0), alive = on.filter(a => READY.has(a.id)).length;
    this.subEl.textContent = this.onboard && !on.length ? '先起个名字吧' : `${on.length} 个专辑，变成了 ${on.length} 个地方`;
    this.stats.innerHTML = `<b>${on.length}</b> 个专辑 · <b>${posts}</b> 篇收藏<br><b>${alive}</b> 个已经开放，其余正在捏${this.from ? '' : '<button data-reset>换个称呼 · 重新授权</button>'}`;
    this.stats.style.opacity = this.onboard && !on.length ? 0 : 1;
  }

  share(a) {
    const base = location.href.split('#')[0], who = this.owner;
    const on = this.albums.filter(x => this.authorized.has(x.id));
    if (a) {
      shareModal({ kicker: `${who}的${WORLD[a.id]}`, title: a.name, cover: a.cover.src, stamp: '入场券', meta: `<b>${a.count} 篇收藏 · 来自专辑「${esc(a.album)}」</b><br>No.0001 · ${new Date().toLocaleDateString('zh-CN')}`, link: `${base}#/w/${a.id}?from=${encodeURIComponent(who)}`, owner: who });
    } else {
      shareModal({ kicker: `来逛${who}的`, title: '岛岛', cover: on[0]?.cover.src || this.albums[0].cover.src, stamp: '上岛邀请', meta: `<b>${on.length} 个专辑 · ${on.reduce((s, x) => s + x.count, 0)} 篇收藏</b><br>${on.map(x => WORLD[x.id]).join(' · ')}`, link: `${base}#/?from=${encodeURIComponent(who)}`, color: '#FF6FA3', shadow: '#E0457E', owner: who });
    }
  }

  update(dt, t) {
    const cam = this.engine.camera;
    if (this.intro) {
      this.intro.t += dt / 1.8;
      const k = ease(Math.min(1, this.intro.t));
      cam.position.lerpVectors(this.intro.from, this.intro.to, k);
      cam.lookAt(this.orbit.target);
      if (this.intro.t >= 1) this.intro = null;
    } else if (this.orbit.enabled) this.orbit.update(dt);
    for (const o of this.anim) o.userData.update?.(t);
    // 岛岛：一直转过来看着你；每隔几秒换一句
    const m = this.mascot;
    m.userData.face(Math.atan2(cam.position.x - m.position.x, cam.position.z - m.position.z));
    m.userData.update(t, dt);
    if (!this.locked) { this.lineT += dt; if (this.lineT > 5.5) this.nextLine(); }
    if (this.bubble) {
      const u = this.bubble.userData; u.pop = Math.min(1, u.pop + dt * 4);
      const dist = cam.position.distanceTo(m.position);
      const k = backOut(u.pop), base = THREE.MathUtils.clamp(dist * (this.engine.portrait ? 0.05 : 0.04), 0.5, this.engine.portrait ? 2.4 : 1.5);
      const aspect = this.bubble.material.map.userData.aspect;
      this.bubble.scale.set(base * aspect * k, base * k, 1);
      this.bubble.position.y = MASCOT.y + 2.05 + Math.sin(t * 2) * 0.04 + (m.position.y - MASCOT.y);
    }
    for (const b of Object.values(this.buildingsById)) {
      const u = b.userData;
      let pk = 1;
      if (u.pop) {
        u.pop.t += dt;
        if (u.pop.t >= 0 && !b.visible) { b.visible = true; this.puff(b.position); }
        pk = u.pop.t < 0 ? 0 : backOut(Math.min(1, u.pop.t / 0.8));
        if (u.pop.t > 0.8) u.pop = null;
      }
      const target = (this.hover === b || this.selected === b) ? 1.05 : 1;
      u.s = (u.s ?? 1) + (target - (u.s ?? 1)) * Math.min(1, dt * 8);
      if (u.bounce > 0.01) u.bounce *= Math.pow(0.04, dt); else u.bounce = 0;
      const bo = Math.sin(t * 18) * 0.08 * (u.bounce || 0);
      b.scale.set(pk * (u.s - bo * 0.5), Math.max(0.001, pk * (u.s + bo)), pk * (u.s - bo * 0.5));
      if (u.label) u.label.position.y = 3.55 + Math.sin(t * 1.6 + b.position.x) * 0.06;
    }
    for (const p of Object.values(this.plotsById)) {
      const u = p.userData;
      if (u.popOut) { u.popOut.t += dt; if (u.popOut.t >= 0) { const k = Math.max(0, 1 - u.popOut.t / 0.25); p.scale.setScalar(k); if (k === 0) { p.visible = false; p.scale.setScalar(1); u.popOut = null; } } continue; }
      const target = (this.hover === p || this.selected === p) ? 1.06 : 1;
      if (u.bounce > 0.01) u.bounce *= Math.pow(0.04, dt); else u.bounce = 0;
      p.scale.setScalar(target + Math.sin(t * 18) * 0.06 * (u.bounce || 0));
    }
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const g = this.puffs[i]; g.userData.t += dt;
      const k = g.userData.t / 0.9;
      g.children.forEach(c => { c.position.addScaledVector(c.userData.dir, dt * 2.2 * (1 - k)); c.scale.setScalar(1 + k * 0.6); });
      g.userData.mat.opacity = Math.max(0, 0.95 * (1 - k));
      if (k >= 1) { this.scene.remove(g); g.userData.mat.dispose(); this.puffs.splice(i, 1); }
    }
    this.trainA += dt * 0.13;
    this.cars.forEach((car, i) => {
      const a = this.trainA - i * 0.19;
      car.position.set(Math.cos(a) * this.TR, 0.36 + Math.abs(Math.sin(t * 9 + i)) * 0.015, Math.sin(a) * this.TR);
      car.rotation.y = -a - Math.PI / 2;
    });
    for (const c of this.clouds) {
      c.userData.a += dt * c.userData.sp;
      c.position.set(Math.cos(c.userData.a) * c.userData.r, c.userData.y + Math.sin(t * 0.4 + c.userData.r) * 0.25, Math.sin(c.userData.a) * c.userData.r);
    }
  }

  dispose() {
    const dom = this.engine.canvas;
    dom.removeEventListener('pointerdown', this._down);
    dom.removeEventListener('pointerup', this._up);
    dom.removeEventListener('pointermove', this._move);
    dom.style.cursor = '';
    clearTimeout(this.idle);
    this.engine.shift(0, 0);
    this.orbit.dispose();
    disposeScene(this.scene);
  }
}
