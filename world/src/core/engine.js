// 渲染引擎：一个 renderer + 一个 camera，世界（场景）可以切换；负责转场、贴图加载、画质分档
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { setLowQuality } from './clay.js';

export class Engine {
  constructor(canvas) {
    this.viewOff = { x: 0, y: 0, tx: 0, ty: 0 };
    this.canvas = canvas;
    this.mobile = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 560;
    setLowQuality(this.mobile);
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio, this.mobile ? 1.75 : 2));
    r.setSize(innerWidth, innerHeight, false);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    this.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.05, 600);
    this.camera.rotation.order = 'YXZ';
    const pm = new THREE.PMREMGenerator(r);
    this.env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    this.maxAniso = Math.min(8, r.capabilities.getMaxAnisotropy());
    this.world = null;
    this.last = performance.now();
    this.time = 0;
    addEventListener('resize', () => this.resize());
    this.resize();
    r.setAnimationLoop(() => this.tick());
  }

  get portrait() { return innerHeight > innerWidth; }

  resize() {
    const cam = this.camera;
    cam.aspect = innerWidth / innerHeight;
    cam.fov = this.world?.fov?.(this.portrait) ?? (this.portrait ? 72 : 60);
    cam.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.world?.resize?.();
  }

  tick() {
    const now = performance.now();
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now; this.time += dt;
    if (!this.world) return;
    this.world.update(dt, this.time);
    this.applyViewOffset(dt);
    this.renderer.render(this.world.scene, this.camera);
  }

  // 让画面整体平移（详情面板打开时，把主体让到面板外面）。x、y 是屏幕宽高的比例
  shift(x = 0, y = 0) { this.viewOff.tx = x; this.viewOff.ty = y; }
  applyViewOffset(dt) {
    const v = this.viewOff; if (!v) return;
    const k = Math.min(1, dt * 6);
    v.x += (v.tx - v.x) * k; v.y += (v.ty - v.y) * k;
    if (Math.abs(v.x) < 0.0005 && Math.abs(v.y) < 0.0005 && !v.tx && !v.ty) { if (this.camera.view?.enabled) this.camera.clearViewOffset(); return; }
    const W = innerWidth, H = innerHeight;
    this.camera.setViewOffset(W, H, v.x * W, v.y * H, W, H);
  }

  async show(world, text) {
    const fade = document.getElementById('fade');
    if (text) document.getElementById('fade-text').textContent = text;
    fade.classList.add('on');
    await new Promise(r => setTimeout(r, 450));
    if (this.world) { this.world.dispose(); this.world = null; }
    document.getElementById('ui').innerHTML = '';
    this.camera.clearViewOffset();
    this.viewOff = { x: 0, y: 0, tx: 0, ty: 0 };
    await world.build();
    world.scene.environment = this.env;
    world.scene.environmentIntensity = world.envIntensity ?? 0.35;
    this.world = world;
    this.resize();
    // 先渲染一帧把着色器编译掉，避免转场后卡顿
    this.renderer.compile(world.scene, this.camera);
    this.world.update(0, this.time);
    this.renderer.render(world.scene, this.camera);
    requestAnimationFrame(() => fade.classList.remove('on'));
    world.entered?.();
  }

  // 加载图片贴图；手机上先缩小，省显存
  loadTexture(src, max = this.mobile ? 768 : 1280) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        let source = img;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        if (scale < 1) {
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          source = c;
        }
        const t = new THREE.Texture(source);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = this.maxAniso;
        t.needsUpdate = true;
        t.userData.aspect = img.width / img.height;
        resolve(t);
      };
      img.onerror = () => reject(new Error(`图片加载失败：${src}`));
      img.src = src;
    });
  }
}

// 释放一个场景里我们自己创建的几何、贴图（材质缓存是全局共享的，不释放）
export function disposeScene(scene, keepGeometries) {
  scene.traverse(o => {
    if (o.isMesh || o.isSprite) {
      if (o.geometry && !keepGeometries?.has(o.geometry) && o.geometry.parameters === undefined) o.geometry.dispose?.();
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of ms) {
        if (!m) continue;
        for (const k of ['map', 'emissiveMap']) if (m[k] && !m[k].userData?.shared) m[k].dispose();
        if (m.userData?.own) m.dispose();
      }
    }
  });
}

export const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const lerpAngle = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; };
