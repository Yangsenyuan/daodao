// 第一人称漫游：桌面 = WASD/方向键 + 拖动环顾 + 滚轮前后 + 点击地面走过去；手机 = 拖动环顾 + 点地面走过去
// 点到可交互物体时交给世界处理（onTap 返回 true 表示已处理）
import * as THREE from 'three';
import { ease, lerpAngle } from './engine.js';

export class Walk {
  constructor(engine, { x = 0, z = 0, yaw = 0, pitch = 0, eye = 1.6, walkable = () => true, onTap, onHover, onMove } = {}) {
    this.engine = engine; this.camera = engine.camera; this.dom = engine.canvas;
    this.pos = new THREE.Vector3(x, 0, z);
    this.yaw = yaw; this.pitch = pitch; this.eye = eye;
    this.walkable = walkable; this.onTap = onTap; this.onHover = onHover; this.onMove = onMove;
    this.keys = new Set(); this.vel = new THREE.Vector2();
    this.speed = 3.4; this.bob = 0; this.enabled = true;
    this.auto = null; this.tween = null; this.down = null;
    this.ndc = new THREE.Vector2();
    this.ray = new THREE.Raycaster();
    const on = (t, e, f, o) => { t.addEventListener(e, f, o); this._off.push(() => t.removeEventListener(e, f, o)); };
    this._off = [];
    on(this.dom, 'pointerdown', e => this.pointerDown(e));
    on(this.dom, 'pointermove', e => this.pointerMove(e));
    on(this.dom, 'pointerup', e => this.pointerUp(e));
    on(this.dom, 'pointercancel', () => { this.down = null; });
    on(this.dom, 'wheel', e => { e.preventDefault(); this.cancel(); this.nudge(-e.deltaY * 0.004); }, { passive: false });
    on(window, 'keydown', e => { if (e.target.closest?.('input,textarea')) return; this.keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); if (this.keys.size) this.cancel(); });
    on(window, 'keyup', e => this.keys.delete(e.code));
    on(window, 'blur', () => this.keys.clear());
  }

  dispose() { this._off.forEach(f => f()); }

  toNdc(e) {
    const r = this.dom.getBoundingClientRect();
    this.ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    return this.ndc;
  }

  pointerDown(e) {
    if (!this.enabled) return;
    this.dom.setPointerCapture?.(e.pointerId);
    this.down = { x: e.clientX, y: e.clientY, t: performance.now(), lx: e.clientX, ly: e.clientY, drag: false, id: e.pointerId };
  }
  pointerMove(e) {
    const d = this.down;
    if (!d || d.id !== e.pointerId) { if (e.pointerType === 'mouse') this.onHover?.(this.toNdc(e)); return; }
    const dx = e.clientX - d.lx, dy = e.clientY - d.ly;
    d.lx = e.clientX; d.ly = e.clientY;
    if (!d.drag && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) { d.drag = true; this.cancel(); }
    if (d.drag) {
      const k = (e.pointerType === 'touch' ? 0.0062 : 0.0042) * (this.camera.fov / 60);
      this.yaw += dx * k;              // “抓住世界”式拖动，和街景一致
      this.pitch = THREE.MathUtils.clamp(this.pitch + dy * k, -0.75, 0.6);
    }
  }
  pointerUp(e) {
    const d = this.down; this.down = null;
    if (!d || d.drag || performance.now() - d.t > 600) return;
    const ndc = this.toNdc(e);
    if (this.onTap?.(ndc)) return;
    // 没点到展品：如果点到地面，就走过去
    this.ray.setFromCamera(ndc, this.camera);
    const hit = this.ray.intersectObjects(this.floors || [], false)[0];
    if (hit) this.walkTo(hit.point.x, hit.point.z);
  }

  cancel() { this.auto = null; if (this.tween?.soft) this.tween = null; }

  nudge(dist) {
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    this.tryMove(fx * dist, fz * dist);
  }

  walkTo(x, z) {
    // 目标点贴墙时往回收一点
    const dx = x - this.pos.x, dz = z - this.pos.z, len = Math.hypot(dx, dz);
    if (len < 0.3) return;
    const stop = Math.max(0, len - 0.6);
    this.auto = { x: this.pos.x + dx / len * stop, z: this.pos.z + dz / len * stop, yaw: Math.atan2(-dx, -dz) };
  }

  // 平滑飞到某个机位（导览、点展品时用）
  flyTo({ x, z, yaw, pitch = 0 }, dur = 1.2, soft = true) {
    this.auto = null;
    return new Promise(done => {
      const dist = Math.hypot(x - this.pos.x, z - this.pos.z);
      this.tween = { from: { x: this.pos.x, z: this.pos.z, yaw: this.yaw, pitch: this.pitch }, to: { x, z, yaw, pitch }, t: 0, dur: Math.max(0.5, Math.min(dur, 0.6 + dist * 0.12)), done, soft };
    });
  }

  tryMove(mx, mz) {
    let moved = false;
    if (this.walkable(this.pos.x + mx, this.pos.z)) { this.pos.x += mx; moved = true; }
    if (this.walkable(this.pos.x, this.pos.z + mz)) { this.pos.z += mz; moved = true; }
    return moved;
  }

  update(dt) {
    let moving = false;
    if (this.tween) {
      const tw = this.tween; tw.t += dt / tw.dur;
      const k = ease(Math.min(1, tw.t));
      this.pos.x = THREE.MathUtils.lerp(tw.from.x, tw.to.x, k);
      this.pos.z = THREE.MathUtils.lerp(tw.from.z, tw.to.z, k);
      this.yaw = lerpAngle(tw.from.yaw, tw.to.yaw, k);
      this.pitch = THREE.MathUtils.lerp(tw.from.pitch, tw.to.pitch, k);
      moving = tw.t < 0.9;
      if (tw.t >= 1) { this.tween = null; tw.done(); }
    } else {
      const k = this.keys;
      const f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
      const s = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
      const turn = (k.has('ArrowLeft') ? 1 : 0) - (k.has('ArrowRight') ? 1 : 0) + (k.has('KeyQ') ? 1 : 0) - (k.has('KeyE') ? 1 : 0);
      this.yaw += turn * dt * 1.9;
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
      const sp = this.speed * (k.has('ShiftLeft') ? 1.7 : 1);
      const tx = (fx * f + rx * s) * sp, tz = (fz * f + rz * s) * sp;
      this.vel.x += (tx - this.vel.x) * Math.min(1, dt * 10);
      this.vel.y += (tz - this.vel.y) * Math.min(1, dt * 10);
      if (this.auto) {
        const a = this.auto, dx = a.x - this.pos.x, dz = a.z - this.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.08) this.auto = null;
        else {
          const v = Math.min(this.speed * 1.1, d * 3.2);
          this.vel.set(dx / d * v, dz / d * v);
          this.yaw = lerpAngle(this.yaw, a.yaw, Math.min(1, dt * 3));
        }
      }
      if (this.vel.lengthSq() > 0.0004) {
        moving = this.tryMove(this.vel.x * dt, this.vel.y * dt);
        if (!moving && this.auto) this.auto = null;
      }
    }
    this.bob += dt * (moving ? 9 : 0);
    const cam = this.camera;
    cam.position.set(this.pos.x, this.eye + (moving ? Math.sin(this.bob) * 0.025 : 0), this.pos.z);
    cam.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    if (moving) this.onMove?.(this.pos);
  }
}
