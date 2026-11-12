// 翻页书：硬封面 + 纸页（翻动时卷曲）+ 封底。页面内容由外部按 key 画在 canvas 上，并返回可点区域（热区）
// 坐标：书脊沿 z 轴、位于 x=0；右页在 x>0，左页在 x<0；书平放，页面朝 +y
// key 规则：第 i 片书页正面 = `${i}:f`（翻开前在右边），背面 = `${i}:b`（翻过去后在左边）；封底内页 = 'board'
// 第 0 片是封面。跨页 s 表示前 s 片已翻到左边：左页 = `${s-1}:b`，右页 = s < N ? `${s}:f` : 'board'
import * as THREE from 'three';
import { clay, rboxGeo, mesh } from './clay.js';

const SEG = 28;

export class FlipBook {
  constructor({ leaves, W = 1, H = 1.38, res = 1000, cover = '#FFD44A', edge = '#FFF8EA', draw }) {
    this.N = leaves; this.W = W; this.H = H; this.draw = draw;
    this.PW = 1000; this.PH = Math.round(1000 * H / W); this.res = res;
    this.T = 0.03; this.g = 0.0042;
    this.group = new THREE.Group();
    this.tex = new Map(); this.hot = new Map();
    this.s = 0; this.queue = []; this.anim = null;
    this.paperMat = clay(edge, { bump: 0.3, repeat: 6 });

    // 封底：硬板 + 内页
    const CW = W + 0.05, CH = H + 0.08;
    this.board = mesh(rboxGeo(CW, this.T, CH, 0.012, 2), clay(cover, { repeat: 4 }), { x: CW / 2 - 0.01, y: this.T / 2 });
    this.group.add(this.board);
    this.boardPage = this.plane(W, H, { key: 'board' });
    this.boardPage.rotation.x = -Math.PI / 2; this.boardPage.position.set(W / 2, this.T + 0.0012, 0);
    this.group.add(this.boardPage);
    // 书页厚度：两摞纸
    this.stackR = mesh(rboxGeo(W - 0.01, 1, H - 0.01, 0.004, 1), this.paperMat, { x: W / 2, cast: false });
    this.stackL = mesh(rboxGeo(W - 0.01, 1, H - 0.01, 0.004, 1), this.paperMat, { x: -W / 2, cast: false });
    this.group.add(this.stackR, this.stackL);

    // 封面：绕书脊转的硬板，上面贴封面，下面贴扉页
    this.cover = new THREE.Group();
    this.cover.add(mesh(rboxGeo(CW, this.T, CH, 0.012, 2), clay(cover, { repeat: 4 }), { x: CW / 2 - 0.01 }));
    this.coverTop = this.plane(W, H, { key: '0:f' });
    this.coverTop.rotation.x = -Math.PI / 2; this.coverTop.position.set(W / 2, this.T / 2 + 0.0012, 0);
    this.coverIn = this.plane(W, H, { key: '0:b', fu: true, fv: true });
    this.coverIn.rotation.x = Math.PI / 2; this.coverIn.position.set(W / 2, -this.T / 2 - 0.0012, 0);
    this.cover.add(this.coverTop, this.coverIn);
    this.group.add(this.cover);
    this.coverA = 0;

    // 纸页（第 1..N-1 片）
    this.leaves = [];
    for (let i = 1; i < this.N; i++) {
      const geo = new THREE.PlaneGeometry(1, 1, SEG, 1);
      const front = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.95, side: THREE.FrontSide, emissive: '#FFFFFF', emissiveIntensity: 0.42 }));
      const back = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.95, side: THREE.BackSide, emissive: '#FFFFFF', emissiveIntensity: 0.42 }));
      for (const [m, k, fu] of [[front, `${i}:f`, false], [back, `${i}:b`, true]]) {
        m.material.userData.own = true; m.castShadow = true; m.receiveShadow = true;
        m.userData.page = { key: k, fu, fv: false };
        this.group.add(m);
      }
      const leaf = { i, geo, front, back, a: 0 };
      this.leaves.push(leaf);
    }
    this.layout(true);
  }

  // 平面页（封面、扉页、封底内页）
  plane(W, H, page) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ roughness: 0.9, emissive: '#FFFFFF', emissiveIntensity: 0.42 }));
    m.material.userData.own = true; m.receiveShadow = true;
    m.userData.page = { fu: false, fv: false, ...page };
    return m;
  }

  yR(i) { return this.T + (this.N - i) * this.g; }      // 第 i 片在右摞时的高度
  yL(i) { return this.T + i * this.g; }                 // 第 i 片在左摞时的高度
  get left() { return this.s > 0 ? `${this.s - 1}:b` : null; }
  get right() { return this.s < this.N ? `${this.s}:f` : 'board'; }

  // 把一片纸摆成角度 a（0 = 平躺在右，π = 平躺在左），dir 决定卷曲方向
  shape(leaf, a, dir = 1, y) {
    const p = leaf.geo.attributes.position, W = this.W, H = this.H, curl = 0.75 * Math.sin(a);
    const xs = [0], ys = [0];
    for (let j = 1; j <= SEG; j++) {
      const u = (j - 0.5) / SEG, phi = a + dir * curl * Math.pow(u, 1.6);
      xs.push(xs[j - 1] + Math.cos(phi) * W / SEG);
      ys.push(ys[j - 1] + Math.sin(phi) * W / SEG);
    }
    for (let iy = 0; iy <= 1; iy++) for (let ix = 0; ix <= SEG; ix++) {
      const k = iy * (SEG + 1) + ix;
      p.setXYZ(k, xs[ix], y + ys[ix], iy === 0 ? -H / 2 : H / 2);
    }
    p.needsUpdate = true;
    leaf.geo.computeVertexNormals();
    leaf.geo.computeBoundingSphere();
  }

  // 静止状态：按当前跨页摆好所有书页，只显示能看到的几片，准备好它们的贴图
  layout(first) {
    const s = this.s;
    for (const leaf of this.leaves) {
      if (this.anim?.leaf === leaf) continue;
      const flipped = leaf.i < s;
      leaf.a = flipped ? Math.PI : 0;
      const vis = leaf.i >= s - 2 && leaf.i <= s + 1;
      leaf.front.visible = leaf.back.visible = vis;
      if (vis || first) this.shape(leaf, leaf.a, 1, flipped ? this.yL(leaf.i) : this.yR(leaf.i));
    }
    if (this.anim?.cover === undefined) this.coverA = s > 0 ? Math.PI : 0;
    this.placeCover();
    // 看得见的是两摞最上面的两片，其余的用一块纸砖表示厚度
    const nR = Math.max(0, this.N - s - 2), nL = Math.max(0, s - 3);
    this.stackR.visible = nR > 0; this.stackL.visible = nL > 0;
    this.stackR.scale.y = Math.max(0.001, nR * this.g); this.stackR.position.y = this.T + nR * this.g / 2;
    this.stackL.scale.y = Math.max(0.001, nL * this.g); this.stackL.position.y = this.T + nL * this.g / 2;
    this.boardPage.visible = s >= this.N - 1;
    this.textures();
  }

  placeCover() {
    const a = this.coverA, k = a / Math.PI;
    this.cover.rotation.z = a;
    this.cover.position.y = (1 - k) * (this.yR(1) + this.T / 2 + 0.002) + k * (this.T / 2) + Math.sin(a) * 0.02;
  }

  // 贴图只保留当前跨页附近的页，离开的释放掉
  textures() {
    const s = this.s, want = new Set(['0:f', '0:b', 'board']);
    for (let i = Math.max(1, s - 2); i <= Math.min(this.N - 1, s + 1); i++) { want.add(`${i}:f`); want.add(`${i}:b`); }
    for (const [k, t] of this.tex) if (!want.has(k)) { t.dispose(); this.tex.delete(k); }
    const assign = (m) => { const k = m.userData.page.key; m.material.map = want.has(k) ? this.texture(k, m.userData.page) : null; m.material.emissiveMap = m.material.map; m.material.color.set(m.material.map ? '#FFFFFF' : '#FFF8EA'); m.material.needsUpdate = true; };
    for (const leaf of this.leaves) { assign(leaf.front); assign(leaf.back); }
    assign(this.coverTop); assign(this.coverIn); assign(this.boardPage);
  }

  texture(key, page) {
    if (this.tex.has(key)) return this.tex.get(key);
    const c = document.createElement('canvas');
    const sc = this.res / this.PW;
    c.width = this.res; c.height = Math.round(this.PH * sc);
    const g = c.getContext('2d'); g.scale(sc, sc);
    this.hot.set(key, this.draw(key, g, this.PW, this.PH) || []);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    if (page.fu || page.fv) { t.repeat.set(page.fu ? -1 : 1, page.fv ? -1 : 1); t.offset.set(page.fu ? 1 : 0, page.fv ? 1 : 0); }
    this.tex.set(key, t);
    return t;
  }

  // 页面内容变了（打勾、写回信）：重画这一页
  redraw(key) {
    const t = this.tex.get(key); if (!t) return;
    const c = t.image, g = c.getContext('2d'), sc = this.res / this.PW;
    g.setTransform(sc, 0, 0, sc, 0, 0); g.clearRect(0, 0, this.PW, this.PH);
    this.hot.set(key, this.draw(key, g, this.PW, this.PH) || []);
    t.needsUpdate = true;
  }

  // ---------- 翻页 ----------
  get busy() { return !!this.anim || this.queue.length > 0; }
  get target() { return this.s + this.queue.reduce((a, b) => a + b, 0) + (this.anim?.d > 0 ? 1 : 0); }
  next() { if (this.target < this.N) this.queue.push(+1); }
  prev() { if (this.target > 0) this.queue.push(-1); }
  goto(target) {
    target = Math.max(0, Math.min(this.N, target));
    let s = this.s + this.queue.reduce((a, b) => a + b, 0) + (this.anim?.d > 0 ? 1 : 0);
    while (s < target) { this.queue.push(+1); s++; }
    while (s > target) { this.queue.push(-1); s--; }
  }
  onTurn(fn) { this._turn = fn; }

  update(dt) {
    if (!this.anim && this.queue.length) {
      const d = this.queue.shift(), fast = this.queue.length > 0;
      const i = d > 0 ? this.s : this.s - 1;
      if (d < 0) { this.s -= 1; }
      this.anim = { i, d, t: 0, dur: fast ? 0.26 : 0.8 };
      if (i === 0) this.anim.cover = true; else this.anim.leaf = this.leaves[i - 1];
      // 翻动前先把将要露出来的那页准备好
      const peek = d > 0 ? this.s + 1 : this.s - 1;
      const keep = this.s; this.s = Math.max(0, Math.min(this.N, peek)); this.textures(); this.s = keep;
      for (const leaf of this.leaves) if (leaf.i >= Math.min(i, peek) - 1 && leaf.i <= Math.max(i, peek) + 1) { leaf.front.visible = leaf.back.visible = true; }
      this.boardPage.visible = true;
    }
    const an = this.anim;
    if (!an) return;
    an.t = Math.min(1, an.t + dt / an.dur);
    const e = an.t < 0.5 ? 2 * an.t * an.t : 1 - Math.pow(-2 * an.t + 2, 2) / 2;
    const a = an.d > 0 ? e * Math.PI : (1 - e) * Math.PI;
    if (an.cover) { this.coverA = a; this.placeCover(); }
    else {
      const leaf = an.leaf, k = a / Math.PI;
      const y = (1 - k) * this.yR(leaf.i) + k * this.yL(leaf.i) + Math.sin(a) * 0.03;
      this.shape(leaf, a, an.d, y);
    }
    if (an.t >= 1) {
      if (an.d > 0) this.s += 1;
      this.anim = null;
      this.layout();
      this._turn?.(this.s);
    }
  }

  // 点击：返回 { key, x, y, spot }（x、y 为页面像素坐标）
  hitTest(raycaster) {
    const cands = [this.coverTop, this.coverIn, this.boardPage, ...this.leaves.flatMap(l => [l.front, l.back])].filter(m => m.visible && m.material.map);
    const h = raycaster.intersectObjects(cands, false)[0];
    if (!h || !h.uv) return null;
    const p = h.object.userData.page;
    const u = p.fu ? 1 - h.uv.x : h.uv.x, v = p.fv ? 1 - h.uv.y : h.uv.y;
    const x = u * this.PW, y = (1 - v) * this.PH;
    const spot = (this.hot.get(p.key) || []).find(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    return { key: p.key, x, y, spot, side: p.key === this.left ? 'L' : 'R' };
  }

  dispose() {
    for (const t of this.tex.values()) t.dispose();
    this.tex.clear();
    for (const l of this.leaves) l.geo.dispose();
  }
}
