// 岛岛：岛上的向导小人（按用户提供的形象捏成黏土版）
// 土豆蛋身形 + 红色 RED 短袖 + 头顶爱心芽 + ⌒ 笑眼 + 腮红；会呼吸、眨眼、挥手、点一下会跳
import * as THREE from 'three';
import { clay, flat, mesh, sphereGeo, capsuleGeo, cylGeo } from './clay.js';
import { FONT } from './text.js';

const SKIN = '#F7D3BC', BLUSH = '#F7A7A0', SHIRT = '#FF2442', LEAF = '#1FA67A', INK = '#2A2228';

// 身体轮廓（半径, 高度）：底宽顶圆
const PROFILE = [[0, 0.26], [0.3, 0.27], [0.47, 0.33], [0.57, 0.44], [0.62, 0.6], [0.63, 0.8], [0.61, 1.0], [0.57, 1.2], [0.5, 1.4], [0.41, 1.57], [0.29, 1.71], [0.15, 1.8], [0, 1.83]];
function radiusAt(y) {
  for (let i = 1; i < PROFILE.length; i++) {
    const [r0, y0] = PROFILE[i - 1], [r1, y1] = PROFILE[i];
    if (y <= y1) return r0 + (r1 - r0) * (y - y0) / (y1 - y0);
  }
  return 0;
}
const surfZ = (x, y, out = 0) => Math.sqrt(Math.max(0, (radiusAt(y) + out) ** 2 - x * x));
// 头顶往右歪一点（参考图里芽长在右上）
function lean(g, k = 0.09) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > 1.1) p.setX(i, p.getX(i) + k * (y - 1.1) ** 2); }
  g.computeVertexNormals();
  return g;
}
const leanX = (y, k = 0.09) => (y > 1.1 ? k * (y - 1.1) ** 2 : 0);

let shared;
function parts() {
  if (shared) return shared;
  const body = lean(new THREE.LatheGeometry(PROFILE.map(([r, y]) => new THREE.Vector2(r, y)), 48));
  // T 恤：沿身体轮廓外扩一圈，只覆盖腰到胸
  const shirtPts = [];
  // 下摆略外扩，领口收进身体里（不再像一圈桶箍）
  for (let y = 0.56; y <= 1.1; y += 0.03) shirtPts.push(new THREE.Vector2(radiusAt(y) + 0.034 * Math.min(1, Math.max(0, (1.1 - y) / 0.14)) + 0.004, y));
  const shirt = new THREE.LatheGeometry(shirtPts, 48);
  const hem = new THREE.TorusGeometry(radiusAt(0.56) + 0.036, 0.022, 8, 48).rotateX(Math.PI / 2).translate(0, 0.56, 0);
  // 胸前 RED 字样：一段贴着 T 恤的圆柱面
  const c = document.createElement('canvas'); c.width = 512; c.height = 180;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `900 132px "Arial Rounded MT Bold","Helvetica Neue",Arial,${FONT}`;
  g.fillText('RED', 256, 96);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.userData.shared = true;
  const textGeo = new THREE.CylinderGeometry(radiusAt(0.82) + 0.04, radiusAt(0.82) + 0.04, 0.26, 32, 1, true, -0.62, 1.24);
  // 爱心叶子
  const s = new THREE.Shape();
  s.moveTo(0, -0.1); s.bezierCurveTo(-0.02, -0.06, -0.13, -0.02, -0.12, 0.05); s.bezierCurveTo(-0.11, 0.11, -0.03, 0.12, 0, 0.06);
  s.bezierCurveTo(0.03, 0.12, 0.11, 0.11, 0.12, 0.05); s.bezierCurveTo(0.13, -0.02, 0.02, -0.06, 0, -0.1);
  const heart = new THREE.ExtrudeGeometry(s, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.018, bevelSegments: 3, curveSegments: 10 });
  heart.translate(0, 0.1, -0.0175);
  const brow = new THREE.TorusGeometry(0.06, 0.013, 6, 16, Math.PI);
  const mouth = new THREE.CircleGeometry(0.062, 20, Math.PI, Math.PI);
  const tongue = new THREE.CircleGeometry(0.036, 16, Math.PI, Math.PI);
  return (shared = { body, shirt, hem, tex, textGeo, heart, brow, mouth, tongue });
}

export function daodao({ scale = 1 } = {}) {
  const P = parts();
  const root = new THREE.Group();
  const bodyG = new THREE.Group(); root.add(bodyG);
  const skin = clay(SKIN, { repeat: 2, bump: 1.1 });
  const red = clay(SHIRT, { repeat: 3, bump: 1.4 });
  bodyG.add(mesh(P.body, skin));
  bodyG.add(mesh(P.shirt, red));
  bodyG.add(mesh(P.hem, red));
  const text = new THREE.Mesh(P.textGeo, new THREE.MeshBasicMaterial({ map: P.tex, transparent: true, depthWrite: false, toneMapped: false }));
  text.position.y = 0.82; text.renderOrder = 2;
  bodyG.add(text);

  // 脸
  const face = new THREE.Group(); bodyG.add(face);
  const ink = flat(INK);
  const eyes = [];
  for (const sx of [-1, 1]) {
    const x = sx * 0.17, ey = 1.29;
    const eye = mesh(sphereGeo(0.058, 16, 12), ink, { x: x + leanX(ey), y: ey, z: surfZ(x, ey) - 0.012, sz: 0.55, cast: false });
    face.add(eye); eyes.push(eye);
    face.add(mesh(sphereGeo(0.016, 8, 6), flat('#ffffff'), { x: x + leanX(ey) + 0.018, y: ey + 0.02, z: surfZ(x, ey) + 0.02, cast: false }));
    const by = 1.45;
    face.add(mesh(P.brow, ink, { x: x + leanX(by), y: by, z: surfZ(x, by) - 0.004, rx: -0.42, cast: false }));
    const cy = 1.17;
    face.add(mesh(sphereGeo(0.1, 16, 12), clay(BLUSH, { bump: 0.4 }), { x: sx * 0.37 + leanX(cy), y: cy, z: surfZ(sx * 0.37, cy) - 0.03, sz: 0.35, sy: 0.75, ry: sx * 0.55, cast: false }));
  }
  const my = 1.205;
  face.add(mesh(P.mouth, flat('#3B1D24'), { x: leanX(my), y: my, z: surfZ(0, my) + 0.006, rx: -0.3, cast: false }));
  face.add(mesh(P.tongue, flat('#FF8A8A'), { x: leanX(my), y: my - 0.026, z: surfZ(0, my - 0.026) + 0.012, rx: -0.3, cast: false }));

  // 芽
  const sprout = new THREE.Group();
  const topY = 1.8, tx = 0.1;
  sprout.position.set(tx + leanX(topY), topY - 0.02, 0);
  sprout.add(mesh(cylGeo(0.018, 0.024, 0.14, 8), clay(LEAF), { y: 0.06, rz: -0.25 }));
  const leaf = mesh(P.heart, clay(LEAF, { repeat: 2 }), { x: 0.06, y: 0.12, rz: -0.55, s: 1.05 });
  sprout.add(leaf);
  bodyG.add(sprout);

  // 手（肩膀处有转轴，能挥手）+ 短袖
  const arms = [];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.55, 1.0, 0.02);
    pivot.add(mesh(sphereGeo(0.15, 20, 14), red, { y: -0.05, x: sx * 0.02, sx: 1.0, sy: 1.05, sz: 0.95 }));
    pivot.add(mesh(capsuleGeo(0.085, 0.2), skin, { y: -0.27 }));
    pivot.rotation.z = sx * 0.28;
    bodyG.add(pivot); arms.push(pivot);
  }
  // 腿 + 脚
  for (const sx of [-1, 1]) {
    root.add(mesh(capsuleGeo(0.105, 0.12), skin, { x: sx * 0.2, y: 0.19 }));
    root.add(mesh(sphereGeo(0.12, 16, 12), skin, { x: sx * 0.21, y: 0.06, z: 0.04, sx: 1.05, sy: 0.6, sz: 1.3 }));
  }
  root.scale.setScalar(scale);

  // ---------- 动作 ----------
  const st = { wave: 0, jump: -1, blink: 2 + Math.random() * 2, yaw: 0, targetYaw: null };
  root.userData.wave = (sec = 2) => { st.wave = sec; };
  root.userData.jump = () => { if (st.jump < 0) st.jump = 0; };
  root.userData.face = yaw => { st.targetYaw = yaw; };
  root.userData.update = (t, dt = 0.016) => {
    const k = Math.sin(t * 2.1);
    bodyG.scale.set(1 + k * 0.012, 1 - k * 0.016, 1 + k * 0.012);
    sprout.rotation.z = Math.sin(t * 2.6) * 0.16;
    leaf.rotation.y = Math.sin(t * 1.7) * 0.3;
    // 眨眼
    st.blink -= dt;
    const closed = st.blink < 0 && st.blink > -0.12;
    for (const e of eyes) e.scale.y = closed ? 0.12 : 1;
    if (st.blink < -0.12) st.blink = 2.5 + Math.random() * 3;
    // 挥手（右手）
    if (st.wave > 0) { st.wave -= dt; arms[1].rotation.z = 2.3 + Math.sin(t * 11) * 0.35; }
    else arms[1].rotation.z += (0.28 - arms[1].rotation.z) * Math.min(1, dt * 6);
    arms[0].rotation.z = -0.28 - Math.max(0, Math.sin(t * 2.1)) * 0.05;
    // 跳一下：先压扁，再弹起
    if (st.jump >= 0) {
      st.jump += dt;
      const j = st.jump;
      if (j < 0.12) bodyG.scale.set(1.12, 0.84, 1.12);
      root.position.y = (root.userData.baseY ?? 0) + (j > 0.12 ? Math.max(0, Math.sin((j - 0.12) / 0.45 * Math.PI)) * 0.55 * scale : 0);
      if (j > 0.57) { st.jump = -1; root.position.y = root.userData.baseY ?? 0; }
    }
    if (st.targetYaw !== null) {
      let d = ((st.targetYaw - root.rotation.y + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      root.rotation.y += d * Math.min(1, dt * 3);
    }
  };
  return root;
}

// 2D 版（SVG）：用在弹窗、日记本页面上的小头像
export const daodaoSvg = (size = 72) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size * 1.2}" viewBox="0 0 120 144" aria-hidden="true">
  <path d="M74 14c4-10 18-10 19-1 1 8-12 13-19 7" fill="${LEAF}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M60 18c-28 0-44 30-46 62-2 26 8 46 46 46s48-20 46-46c-2-34-18-62-46-62z" fill="${SKIN}" stroke="${INK}" stroke-width="3.5"/>
  <path d="M14 80c0-4 1-9 2-12h88c1 3 2 8 2 12 0 10-2 19-6 24H20c-4-5-6-14-6-24z" fill="${SHIRT}" stroke="${INK}" stroke-width="3"/>
  <text x="60" y="97" text-anchor="middle" font-family="Arial Rounded MT Bold,Arial,sans-serif" font-weight="900" font-size="21" fill="#fff">RED</text>
  <path d="M38 43q6-6 12 0M70 43q6-6 12 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
  <circle cx="44" cy="54" r="5" fill="${INK}"/><circle cx="76" cy="54" r="5" fill="${INK}"/>
  <path d="M54 59q6 8 12 0z" fill="#3B1D24"/><ellipse cx="34" cy="62" rx="7" ry="5" fill="${BLUSH}" opacity=".8"/><ellipse cx="86" cy="62" rx="7" ry="5" fill="${BLUSH}" opacity=".8"/>
  <path d="M46 124v12h10v-10M64 126v10h10v-12" fill="${SKIN}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
</svg>`;
