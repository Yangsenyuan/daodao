// 日记本世界：书桌上放着一本翻页书（“成长-自我提升”专辑）
// 书桌：台灯、马克杯、笔筒、绿植、便利贴、窗边软木板上的拍立得、坐在桌上的岛岛
// 翻开后：封面 → 扉页 / 目录 → 每篇一个跨页（打勾、写回信、看原帖）→ 后记 / 结语
import * as THREE from 'three';
import { C, clay, mesh, rbox, rboxGeo, sphereGeo, cylGeo, blobGeo, pottedPlant, skyTexture } from '../core/clay.js';
import { textTexture, bubbleTexture, billboard } from '../core/text.js';
import { disposeScene, ease } from '../core/engine.js';
import { FlipBook } from '../core/book.js';
import { daodao, daodaoSvg } from '../core/mascot.js';
import { ownerName } from '../core/profile.js';
import { makePages } from './diary-pages.js';
import { mount, esc, toast, hint, sheet, shareModal, welcome, memory } from '../ui/overlay.js';

const W = 1, H = 1.38;
const BOOK = new THREE.Vector3(0, 0.03, 0.15);
const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });

export class Diary {
  constructor(engine, { data, from, resume }) {
    this.engine = engine; this.data = data; this.from = from; this.resume = resume;
    this.owner = from || ownerName();
    this.mem = memory.get(data.id);
    this.state = { owner: this.owner, checks: this.mem.checks || {}, replies: this.mem.replies || {}, sealed: this.mem.sealed || null, visitor: !!from };
    if (from) this.state = { ...this.state, checks: {}, replies: {}, sealed: null };
    this.mode = 'desk'; this.side = 'L'; this.picks = []; this.anim = [];
  }
  fov(portrait) { return portrait ? 58 : 42; }
  get envIntensity() { return 0.35; }

  async build() {
    const s = this.scene = new THREE.Scene();
    s.background = new THREE.Color('#F3D3A6');
    s.add(new THREE.HemisphereLight('#FFF6EA', '#C9A27A', 1.0));
    const sun = this.sun = new THREE.DirectionalLight('#FFF1DC', 1.7);
    sun.position.set(3.5, 8, 3); sun.target.position.set(0, 0, 0);
    sun.castShadow = true;
    const sm = this.engine.mobile ? 1024 : 2048;
    sun.shadow.mapSize.set(sm, sm);
    Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 20 });
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
    s.add(sun, sun.target);

    // 图片：拍立得、封面拼贴
    const srcs = [...new Set(this.data.notes.flatMap(n => n.images.map(i => i.src)))];
    const label = document.getElementById('fade-text');
    let k = 0;
    this.imgs = {};
    await Promise.all(srcs.map(async src => { this.imgs[src] = await load(src); k++; if (label) label.textContent = `正在装订… ${k}/${srcs.length}`; }));
    this.mascotImg = await load('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(daodaoSvg(120)));

    this.desk(); this.wall(); this.props(); this.guide();
    this.pages = makePages({ data: this.data, imgs: this.imgs, mascot: this.mascotImg, state: this.state });
    const book = this.book = new FlipBook({ leaves: this.pages.N, W, H, res: this.engine.mobile ? 760 : 1000, cover: '#FFD44A', draw: (k2, g, w, h) => this.pages.draw(k2, g, w, h) });
    book.group.position.copy(BOOK).add(new THREE.Vector3(-W / 2, 0, 0));
    book.group.rotation.y = 0.07;
    book.onTurn(s2 => this.turned(s2));
    s.add(book.group);

    this.ray = new THREE.Raycaster();
    this.camState = this.deskView();
    this.applyCam(this.camState);
    this.input();
    this.ui();
    this.mem = memory.set(this.data.id, { visits: (this.mem.visits || 0) + 1 });
    window.__diary = this;
  }

  // ---------- 书桌 ----------
  desk() {
    const s = this.scene;
    s.add(rbox(11, 0.6, 7.2, '#E9B27C', { y: -0.3, z: -0.2, mat: { repeat: 8, bump: 1.4 }, r: 0.12 }));
    for (let i = 0; i < 7; i++) s.add(rbox(10.6, 0.006, 0.02, '#D99C64', { y: 0.001, z: -3.4 + i * 1.05, cast: false }));
    s.add(rbox(3.6, 0.03, 2.5, '#BFE9D9', { y: 0.015, z: BOOK.z, cast: false, mat: { repeat: 4 } }));
    for (let i = 1; i < 9; i++) s.add(rbox(0.008, 0.002, 2.3, '#A6DDC8', { x: -1.8 + i * 0.4, y: 0.032, z: BOOK.z, cast: false }));
  }
  wall() {
    const s = this.scene;
    s.add(rbox(16, 9, 0.3, '#FFE3C2', { y: 3.2, z: -3.95, cast: false, mat: { repeat: 6, bump: 0.8 } }));
    s.add(rbox(16, 0.9, 0.34, '#BFE9D9', { y: 0.45, z: -3.9, cast: false }));
    // 窗户：天空 + 云（画在玻璃上）
    const c = document.createElement('canvas'); c.width = 512; c.height = 400;
    const g = c.getContext('2d'), grd = g.createLinearGradient(0, 0, 0, 400);
    grd.addColorStop(0, '#46B6F2'); grd.addColorStop(1, '#CDEFFF'); g.fillStyle = grd; g.fillRect(0, 0, 512, 400);
    g.fillStyle = '#FFFFFF';
    for (const [x, y, r] of [[120, 130, 40], [165, 120, 52], [215, 135, 38], [360, 240, 34], [400, 228, 46], [440, 245, 32]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.0), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    glass.material.userData.own = true;
    glass.position.set(2.3, 3.0, -3.79); s.add(glass);
    for (const [x, y, w, h] of [[2.3, 4.05, 2.9, 0.16], [2.3, 1.95, 2.9, 0.16], [0.92, 3.0, 0.16, 2.2], [3.68, 3.0, 0.16, 2.2], [2.3, 3.0, 0.1, 2.0]]) s.add(rbox(w, h, 0.16, C.paper, { x, y, z: -3.74 }));
    s.add(rbox(3.1, 0.12, 0.42, C.paper, { x: 2.3, y: 1.86, z: -3.6 }));
    for (const sx of [0.62, 3.98]) s.add(mesh(blobGeo(0.5, 0.14, sx), clay(C.rose, { repeat: 3 }), { x: sx, y: 3.0, z: -3.6, sx: 0.45, sy: 2.4, sz: 0.3 }));
    // 软木板 + 拍立得（点一下翻到那篇）
    s.add(rbox(2.9, 2.0, 0.1, '#D7A46A', { x: -2.3, y: 2.9, z: -3.76, mat: { repeat: 6, bump: 2.6 } }));
    s.add(rbox(3.05, 2.15, 0.06, C.wood, { x: -2.3, y: 2.9, z: -3.8 }));
    const pinColors = [C.red, C.sky, C.yellow, C.mint, C.pink];
    [[1, -3.15, 3.35, -0.12], [4, -2.2, 3.4, 0.08], [9, -1.35, 3.25, -0.05], [2, -2.85, 2.35, 0.1], [8, -1.8, 2.3, -0.1]].forEach(([no, x, y, rz], i) => {
      const n = this.data.notes[no - 1], img = this.imgs[n.images[0].src];
      const pc = document.createElement('canvas'); pc.width = 240; pc.height = 280;
      const pg = pc.getContext('2d'); pg.fillStyle = '#fff'; pg.fillRect(0, 0, 240, 280);
      if (img) { const sc = Math.max(212 / img.width, 212 / img.height), sw = 212 / sc; pg.drawImage(img, (img.width - sw) / 2, (img.height - sw) / 2, sw, sw, 14, 14, 212, 212); }
      pg.fillStyle = '#26242E'; pg.font = '800 22px sans-serif'; pg.fillText(String(no).padStart(2, '0'), 16, 262);
      const t = new THREE.CanvasTexture(pc); t.colorSpace = THREE.SRGBColorSpace;
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.72), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
      p.material.userData.own = true; p.castShadow = true;
      p.position.set(x, y, -3.69); p.rotation.z = rz;
      p.userData.pick = { type: 'polaroid', no };
      s.add(p); this.picks.push(p);
      s.add(mesh(sphereGeo(0.05, 12, 8), clay(pinColors[i]), { x: x + Math.sin(rz) * -0.3, y: y + 0.3, z: -3.64 }));
    });
  }
  props() {
    const s = this.scene;
    // 台灯
    const lamp = new THREE.Group();
    lamp.add(mesh(cylGeo(0.42, 0.46, 0.1, 32), clay(C.yellow), { y: 0.05 }));
    lamp.add(mesh(cylGeo(0.05, 0.05, 1.5, 12), clay(C.yellow), { y: 0.8, rz: 0.18 }));
    lamp.add(mesh(sphereGeo(0.1, 14, 10), clay(C.orange), { x: -0.13, y: 1.55 }));
    lamp.add(mesh(cylGeo(0.05, 0.05, 1.0, 12), clay(C.yellow), { x: -0.5, y: 1.72, rz: 1.2 }));
    const head = new THREE.Group();
    head.add(mesh(new THREE.SphereGeometry(0.36, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), clay(C.yellow, { side: THREE.DoubleSide })));
    head.add(mesh(sphereGeo(0.14, 16, 12), clay(C.lemon, { emissive: '#FFE7A0', ei: 2.2 }), { y: 0.02, cast: false }));
    head.position.set(-0.95, 1.85, 0); head.rotation.z = 0.7;
    lamp.add(head);
    lamp.position.set(2.75, 0, -1.3); lamp.rotation.y = -0.5;
    s.add(lamp);
    const bulb = new THREE.PointLight('#FFD9A0', 5, 7, 1.6);
    bulb.position.set(1.95, 1.55, -0.85); s.add(bulb);
    // 马克杯
    s.add(mesh(cylGeo(0.28, 0.26, 0.52, 32), clay(C.red), { x: 2.35, y: 0.26, z: 1.15 }));
    s.add(mesh(cylGeo(0.24, 0.24, 0.02, 32), clay('#7A4B3A', { bump: 0.4 }), { x: 2.35, y: 0.48, z: 1.15, cast: false }));
    s.add(mesh(new THREE.TorusGeometry(0.15, 0.045, 10, 24), clay(C.red), { x: 2.66, y: 0.27, z: 1.15, ry: 0.2 }));
    // 笔筒
    s.add(mesh(cylGeo(0.3, 0.3, 0.62, 28), clay(C.sky), { x: -2.6, y: 0.31, z: -1.05 }));
    [[C.orange, 0.1, 0.08, 0.1], [C.pink, -0.12, 0.05, -0.12], [C.mint, 0.02, -0.12, 0.05]].forEach(([col, dx, dz, rz]) => {
      s.add(mesh(cylGeo(0.05, 0.05, 1.0, 6), clay(col), { x: -2.6 + dx, y: 0.75, z: -1.05 + dz, rz }));
      s.add(mesh(cylGeo(0.05, 0.005, 0.14, 6), clay(C.sand), { x: -2.6 + dx - Math.sin(rz) * 0.56, y: 1.31, z: -1.05 + dz, rz }));
    });
    // 绿植、一摞书
    const plant = pottedPlant({ pot: C.coral }); plant.position.set(-3.6, 0, -2.4); plant.scale.setScalar(1.3); s.add(plant);
    [[C.indigo, 0.18], [C.mint, 0.16], [C.pink, 0.14]].reduce((y, [col, h], i) => { s.add(rbox(1.2 - i * 0.08, h, 0.85, col, { x: -3.5, y: y + h / 2, z: 0.5, ry: 0.15 * (i - 1), r: 0.03 })); return y + h; }, 0);
    // 便利贴
    const sticky = (txt, color, x, z, rot) => {
      const t = textTexture({ w: 360, h: 360, lines: [{ t: txt, size: 46, weight: 800, color: '#3B342C' }], pad: 34, bg: color, radius: 6 });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.75), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
      m.material.userData.own = true; m.receiveShadow = true;
      m.rotation.set(-Math.PI / 2, 0, rot); m.position.set(x, 0.006, z); s.add(m);
    };
    sticky('今天也要好好生活', '#FFF1A8', -2.6, 1.55, 0.18);
    sticky('勾掉一件，就离她近一点', '#FFD1DE', 2.3, 2.15, -0.12);
  }

  guide() {
    const m = this.mascot = daodao({ scale: 0.48 });
    m.position.set(-1.85, 0.03, 0.85); m.userData.baseY = 0.03;
    this.scene.add(m);
    m.traverse(o => { o.userData.pickRoot = m; });
    m.userData.pick = { type: 'mascot' };
    this.picks.push(m);
    const first = this.data.notes.find(n => n.idx === 1);
    this.lines = this.from
      ? [`这是${this.from}的日记本`, '翻开看看 TA 想成为的样子', '这一本里有 35 件小事']
      : ['翻开看看，你想成为的样子', `${(first.collects / 10000).toFixed(1)}万人和你收藏了同一篇`, '勾掉一件小事，就离她近一点', '写一句话，给收藏它时的自己', `${this.data.stats.total} 篇，${this.data.stats.todos} 件小事，慢慢来`];
    this.lineI = 0; this.lineT = 0;
    this.say(this.lines[0]);
  }
  say(text) {
    if (this.bubble) { this.scene.remove(this.bubble); this.bubble.material.map.dispose(); this.bubble.material.dispose(); }
    const b = this.bubble = billboard(bubbleTexture(text, { maxW: 480 }), 0.3);
    b.position.set(-1.85, 1.0, 0.85);
    this.scene.add(b); this.lineT = 0;
  }

  // ---------- 镜头 ----------
  deskView() {
    return this.engine.portrait
      ? { pos: new THREE.Vector3(-0.7, 4.9, 5.3), target: new THREE.Vector3(-0.75, 0.3, 0.1) }
      : { pos: new THREE.Vector3(0.3, 4.3, 5.4), target: new THREE.Vector3(0, 0.55, -0.5) };
  }
  // 翻开后：横屏看整个跨页，竖屏只看一页（左 / 右）
  readView(side = this.side) {
    const portrait = this.engine.portrait, cam = this.engine.camera;
    const cx = portrait ? (side === 'L' ? -W / 2 : W / 2) : 0;
    const SW = portrait ? W + 0.1 : 2 * W + 0.32, SH = H + (portrait ? 0.1 : 0.22);
    const tan = Math.tan(THREE.MathUtils.degToRad(this.fov(portrait)) / 2);
    const availV = (innerHeight - (portrait ? 170 : 180)) / innerHeight, availH = portrait ? 0.96 : 0.9;
    const dist = Math.max(SH / 2 / tan / availV, SW / 2 / (tan * cam.aspect) / availH);
    const tilt = 0.16;
    const target = new THREE.Vector3(BOOK.x + cx, BOOK.y + 0.05, BOOK.z + (portrait ? 0.03 : 0.04));
    return { pos: target.clone().add(new THREE.Vector3(0, Math.cos(tilt), Math.sin(tilt)).multiplyScalar(dist)), target };
  }
  applyCam({ pos, target }) { const c = this.engine.camera; c.position.copy(pos); c.lookAt(target); this.lookAt = target.clone(); }
  moveCam(to, ms = 900) {
    const from = { pos: this.engine.camera.position.clone(), target: this.lookAt.clone() };
    this.camTween = { from, to, t: 0, dur: ms / 1000 };
  }
  resize() {
    if (this.mode === 'desk') this.applyCam(this.deskView());
    else if (this.mode === 'read') this.applyCam(this.readView());
  }

  // ---------- 开书 / 合书 ----------
  async open(at) {
    if (this.mode !== 'desk') return;
    this.mode = 'opening';
    this.openBtn.classList.add('hide'); this.hintApi?.hide();
    const g = this.book.group, fromX = g.position.x, fromR = g.rotation.y;
    this.side = 'L';
    this.moveCam(this.readView('L'), 1000);
    const t0 = performance.now();
    await new Promise(done => { const step = () => { const k = ease(Math.min(1, (performance.now() - t0) / 1000)); g.position.x = fromX + (BOOK.x - fromX) * k; g.rotation.y = fromR * (1 - k); k < 1 ? requestAnimationFrame(step) : done(); }; step(); });
    this.mode = 'read';
    this.book.goto(at || 1);
    this.bar.classList.remove('hide');
    this.updateUi();
    if (!this.toldHow) { this.toldHow = true; this.hintApi = hint(this.engine.portrait ? '点屏幕右侧翻下一页 · 点勾选框打勾' : '点右页往后翻 · 点左页往回翻 · 点勾选框打勾'); }
  }
  close() {
    if (this.mode !== 'read') return;
    this.mode = 'closing';
    this.sheet.close();
    this.bar.classList.add('hide');
    this.book.goto(0);
  }
  afterClosed() {
    this.mode = 'desk';
    this.moveCam(this.deskView(), 1000);
    const g = this.book.group, t0 = performance.now(), fromX = g.position.x;
    const step = () => { const k = ease(Math.min(1, (performance.now() - t0) / 1000)); g.position.x = fromX + (BOOK.x - W / 2 - fromX) * k; g.rotation.y = 0.07 * k; if (k < 1) requestAnimationFrame(step); };
    step();
    this.openBtn.classList.remove('hide');
    this.updateUi();
  }
  next() {
    if (this.mode !== 'read') return;
    const b = this.book;
    if (this.engine.portrait && this.side === 'L' && b.target >= 1 && !b.busy) { this.side = 'R'; this.moveCam(this.readView('R'), 520); this.updateUi(); return; }
    if (b.target >= b.N) { toast('已经是最后一页啦'); return; }
    if (this.engine.portrait) { this.side = 'L'; this.moveCam(this.readView('L'), 800); }
    b.next();
  }
  prev() {
    if (this.mode !== 'read') return;
    const b = this.book;
    if (this.engine.portrait && this.side === 'R' && !b.busy) { this.side = 'L'; this.moveCam(this.readView('L'), 520); this.updateUi(); return; }
    if (b.target <= 1) { this.close(); return; }
    if (this.engine.portrait) { this.side = 'R'; this.moveCam(this.readView('R'), 800); }
    b.prev();
  }
  goto(s) {
    if (this.mode === 'desk') { this.open(s); return; }
    this.sheet.close();
    this.book.goto(s);
    if (this.engine.portrait) { this.side = 'L'; this.moveCam(this.readView('L'), 800); }
  }
  turned(s) {
    if (this.mode === 'closing' && s === 0 && !this.book.busy) { this.afterClosed(); return; }
    if (!this.from && s > 0 && this.mode === 'read') this.mem = memory.set(this.data.id, { spread: s });
    this.updateUi();
  }

  // ---------- 点页面上的东西 ----------
  act(spot) {
    const n = spot.no ? this.data.notes[spot.no - 1] : null;
    if (spot.id === 'goto') return this.goto(spot.s);
    if (spot.id === 'url') return window.open(n.url, '_blank', 'noopener');
    if (spot.id === 'share') return this.share();
    if (spot.id === 'close') return this.close();
    if (this.from && ['check', 'reply', 'capsule'].includes(spot.id)) return toast('这是 TA 的日记本', '只能看，不能替 TA 打勾哦');
    if (spot.id === 'check') {
      const arr = [...(this.state.checks[spot.no] || [])]; arr[spot.i] = !arr[spot.i];
      this.state.checks[spot.no] = arr;
      this.mem = memory.set(this.data.id, { checks: this.state.checks });
      this.refresh(spot.no);
      const done = arr.filter(Boolean).length;
      if (arr[spot.i]) toast(done === n.todo.length ? '这一篇的小事都做到了 🎉' : '做到一件 ✓', n.todo[spot.i]);
      return;
    }
    if (spot.id === 'reply') return this.writeReply(n);
    if (spot.id === 'capsule') {
      const d = new Date(); d.setFullYear(d.getFullYear() + 1);
      this.state.sealed = d.toISOString().slice(0, 10);
      this.mem = memory.set(this.data.id, { sealed: this.state.sealed });
      this.book.redraw('board');
      toast('已封存成时间胶囊', `${this.state.sealed.replaceAll('-', '.')} 岛岛会提醒你回来看看`);
    }
  }
  refresh(no) {
    for (const k of this.pages.keysForNote(no)) this.book.redraw(k);
    this.book.redraw('1:f'); this.book.redraw('13:b');
  }
  writeReply(n) {
    const old = this.state.replies[n.no] || '';
    const el = this.sheet.open(`<div class="chips"><span class="chip" style="background:${this.data.chapters[n.chapter].color};color:#fff">第 ${n.no} 篇</span></div>
      <h2>给收藏它时的自己</h2><div class="venue">${esc(n.short)} · 收藏于 ${esc(n.postedAt.replaceAll('-', '.'))} 前后</div>
      <div class="reply-box"><div class="q">“${esc(n.quote)}”</div>
      <textarea maxlength="80" placeholder="比如：后来我真的开始早睡了。">${esc(old)}</textarea></div>`,
      `<button class="pill ghost" data-x>取消</button><button class="pill red" data-save>写进日记</button>`);
    const ta = el.querySelector('textarea');
    setTimeout(() => ta.focus({ preventScroll: true }), 300);
    el.querySelector('[data-x]').onclick = () => this.sheet.close();
    el.querySelector('[data-save]').onclick = () => {
      this.state.replies[n.no] = ta.value.trim();
      this.mem = memory.set(this.data.id, { replies: this.state.replies });
      this.refresh(n.no);
      this.sheet.close();
      toast(ta.value.trim() ? '写进日记了' : '回信已清空', ta.value.trim() ? '一年后再打开，会看到这句话' : '');
    };
  }

  share() {
    const base = location.href.split('#')[0], d = this.data, who = this.owner;
    shareModal({ kicker: `${who}的日记本`, title: d.title, cover: d.notes.find(n => n.idx === 10).images[0].src, stamp: '借阅卡', owner: who, color: '#FFB800', shadow: '#D99A00',
      meta: `<b>${d.stats.total} 篇收藏 · ${d.stats.todos} 件小事</b><br>${d.chapters.map(c => c.name).join(' · ')}`,
      link: `${base}#/w/${d.id}?from=${encodeURIComponent(who)}` });
  }

  // 走查用：页面上某个像素点（1000 × 1380 坐标）在屏幕上的位置
  screenOf(side, px, py) {
    const b = this.book;
    const x = side === 'R' ? px / b.PW * W : -W + px / b.PW * W, z = (py / b.PH - 0.5) * H;
    const v = b.group.localToWorld(new THREE.Vector3(x, 0.06, z)).project(this.engine.camera);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
  }
  spotOnScreen(side, id) {
    const key = side === 'R' ? this.book.right : this.book.left;
    const sp = (this.book.hot.get(key) || []).find(s => s.id === id);
    return sp ? this.screenOf(side, sp.x + Math.min(40, sp.w / 2), sp.y + Math.min(40, sp.h / 2)) : null;
  }

  // ---------- 输入 ----------
  input() {
    const dom = this.engine.canvas, ndc = new THREE.Vector2();
    let down = null;
    const toNdc = e => { const r = dom.getBoundingClientRect(); return ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); };
    const on = (t, ev, f, o) => { t.addEventListener(ev, f, o); this._off.push(() => t.removeEventListener(ev, f, o)); };
    this._off = [];
    on(dom, 'pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    on(dom, 'pointerup', e => {
      if (!down) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y, dt = performance.now() - down.t; down = null;
      if (this.mode === 'read' && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) && dt < 700) { dx < 0 ? this.next() : this.prev(); return; }
      if (Math.hypot(dx, dy) > 8 || dt > 600) return;
      this.tap(toNdc(e), e.clientX);
    });
    on(dom, 'pointermove', e => { if (e.pointerType !== 'mouse' || down) return; dom.style.cursor = this.hoverable(toNdc(e)) ? 'pointer' : 'default'; });
    on(window, 'keydown', e => {
      if (e.target.closest?.('input,textarea')) return;
      if (e.code === 'ArrowRight' || e.code === 'Space') { e.preventDefault(); this.mode === 'desk' ? this.open(this.mem.spread) : this.next(); }
      if (e.code === 'ArrowLeft') this.prev();
      if (e.code === 'Escape') this.sheet.isOpen ? this.sheet.close() : this.close();
    });
  }
  pickAt(ndc) {
    this.ray.setFromCamera(ndc, this.engine.camera);
    const h = this.ray.intersectObjects(this.picks, true)[0];
    if (!h) return null;
    let o = h.object; while (o && !o.userData.pick) o = o.parent;
    return o?.userData.pick;
  }
  hoverable(ndc) {
    this.ray.setFromCamera(ndc, this.engine.camera);
    if (this.mode === 'read') { const h = this.book.hitTest(this.ray); return !!h; }
    return !!this.pickAt(ndc) || this.ray.intersectObject(this.book.group, true).length > 0;
  }
  tap(ndc, clientX) {
    if (this.mode === 'read') {
      this.ray.setFromCamera(ndc, this.engine.camera);
      const h = this.book.hitTest(this.ray);
      if (h?.spot) return this.act(h.spot);
      if (this.sheet.isOpen) return this.sheet.close();
      if (this.engine.portrait) return clientX < innerWidth * 0.33 ? this.prev() : this.next();
      if (h) return h.side === 'L' ? this.prev() : this.next();
      return;
    }
    if (this.mode !== 'desk') return;
    const p = this.pickAt(ndc);
    if (p?.type === 'mascot') { this.mascot.userData.jump(); this.lineI = (this.lineI + 1) % this.lines.length; this.say(this.lines[this.lineI]); return; }
    if (p?.type === 'polaroid') { this.open(p.no + 1); return; }
    this.ray.setFromCamera(ndc, this.engine.camera);
    if (this.ray.intersectObject(this.book.group, true).length) this.open(this.resume && this.mem.spread ? this.mem.spread : 1);
  }

  // ---------- 界面 ----------
  ui() {
    const d = this.data;
    const top = mount(`<header class="topbar">
      <button class="pill" data-back>← 岛岛</button>
      <div class="title-chip"><b>${esc(d.title)}</b><small class="page-name">书桌</small></div>
      <div class="right"><button class="pill red" data-share>分享</button></div></header>`);
    top.querySelector('[data-back]').onclick = () => { location.hash = this.from ? `#/?from=${encodeURIComponent(this.from)}` : '#/'; };
    top.querySelector('[data-share]').onclick = () => this.share();
    this.pageEl = top.querySelector('.page-name');
    this.sheet = sheet();
    this.sheet.onClose = () => this.engine.shift(0, 0);
    this.openBtn = mount(`<button class="pill red open-book">翻开日记本 →</button>`);
    this.openBtn.onclick = () => this.open(this.resume && this.mem.spread ? this.mem.spread : 1);
    this.bar = mount(`<div class="book-bar hide"><button data-prev aria-label="上一页">‹</button><button class="toc" data-toc>目录</button><span class="page"></span><button class="go" data-next>下一页 ›</button><button class="toc" data-close>合上</button></div>`);
    this.bar.querySelector('[data-prev]').onclick = () => this.prev();
    this.bar.querySelector('[data-next]').onclick = () => this.next();
    this.bar.querySelector('[data-toc]').onclick = () => { this.goto(1); if (this.engine.portrait) { this.side = 'R'; this.moveCam(this.readView('R'), 800); } };
    this.bar.querySelector('[data-close]').onclick = () => this.close();
    this.hintApi = hint(this.engine.mobile ? '点一下桌上的日记本，翻开它' : '点一下桌上的日记本，或按 → 翻开');
    if (this.from) welcome({ from: this.from, title: `${this.from}的日记本`, sub: `TA 把 ${d.stats.total} 篇自我成长收藏，装订成了一本日记。<br>里面有 ${d.stats.todos} 件 TA 想做到的小事。`, go: '翻开看看' });
    else if (this.resume && this.mem.spread > 1) setTimeout(() => this.open(this.mem.spread), 600);
  }
  updateUi() {
    const s = this.book.target;
    this.pageEl.textContent = this.mode === 'desk' ? '书桌' : this.pages.label(s) + (this.engine.portrait && s >= 1 ? (this.side === 'L' ? ' · 左页' : ' · 右页') : '');
    this.bar.querySelector('.page').textContent = `${Math.max(1, s)} / ${this.book.N}`;
  }

  update(dt, t) {
    this.book.update(dt);
    if (this.camTween) {
      const c = this.camTween; c.t = Math.min(1, c.t + dt / c.dur);
      const k = ease(c.t);
      const pos = c.from.pos.clone().lerp(c.to.pos, k), target = c.from.target.clone().lerp(c.to.target, k);
      this.applyCam({ pos, target });
      if (c.t >= 1) this.camTween = null;
    }
    const open = this.sheet?.isOpen, portrait = this.engine.portrait;
    if (open) this.engine.shift(!portrait ? 200 / innerWidth : 0, portrait ? 0.28 : 0);
    const m = this.mascot, cam = this.engine.camera;
    m.userData.face(Math.atan2(cam.position.x - m.position.x, cam.position.z - m.position.z));
    m.userData.update(t, dt);
    if (this.mode === 'desk') { this.lineT += dt; if (this.lineT > 5) { this.lineI = (this.lineI + 1) % this.lines.length; this.say(this.lines[this.lineI]); } }
    if (this.bubble) { this.bubble.visible = this.mode === 'desk'; this.bubble.position.y = 1.0 + Math.sin(t * 2) * 0.02 + (m.position.y - 0.03); }
  }

  dispose() {
    this._off.forEach(f => f());
    this.engine.canvas.style.cursor = '';
    this.engine.shift(0, 0);
    this.book.dispose();
    disposeScene(this.scene);
  }
}
