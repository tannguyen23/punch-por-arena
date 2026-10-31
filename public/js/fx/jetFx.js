import { scene, solidMaterial } from '../core/scene.js';
import { ball } from '../core/meshes.js';
import { groundAt } from '../core/terrain.js';
import { JETPACK } from '../config.js';

const { MeshBuilder, Matrix, Color3, Quaternion, Vector3 } = BABYLON;
const { flame, puff } = JETPACK;

// Lửa và khí phun ra từ các cánh quạt của động cơ phản lực khi dash (entities/jetpack.js cho `jet.fans`).
// Không dùng hệ hạt: mỗi ngọn lửa là hai hình nón (instance của mesh nguồn, material dùng chung) đặt đúng chỗ cánh quạt và chĩa ra sau theo
// hướng dash, nhấp nháy bằng co giãn; khí là vòng đệm các quả cầu nhỏ dùng lại, trôi ra sau rồi co lại (không đổi alpha, xem quy tắc 11).
// Không tạo geometry / material mới giữa trận: `prepareJetFx` dựng sẵn và dùng thử một lần lúc vào phòng.

let sources = null; // { outer, inner, puff } mesh nguồn
const puffs = []; // vòng đệm các quả khí
let nextPuff = 0;
const freeFlames = []; // ngọn lửa rảnh để dùng lại
const entries = []; // người đang phun: { jet, root, left, glideSec, gliding, quat, trail, flames, puffIn }
let localPuffIn = 0;
const trailVector = new Vector3();
const DOWN = { x: 0, y: -1, z: 0 };
const GROUNDED = 0.25; // chân cách đất ngần này (mét) là đã hạ cánh, ngọn lửa bắt đầu tắt

function emissiveMaterial(hex) {
  const material = solidMaterial(Color3.Black());
  material.emissiveColor = Color3.FromHexString(hex);
  material.disableLighting = true;
  material.backFaceCulling = false;
  return material;
}

function ensureSources() {
  if (sources) return sources;
  const cone = (name, hex) => {
    const mesh = MeshBuilder.CreateCylinder(name, { diameterTop: 0, diameterBottom: 1, height: 1, tessellation: 6 }, scene);
    mesh.bakeTransformIntoVertices(Matrix.Translation(0, 0.5, 0)); // đáy ở gốc (chỗ cánh quạt), đỉnh ở y = 1
    mesh.material = emissiveMaterial(hex);
    mesh.isVisible = false;
    return mesh;
  };
  const ballSource = ball(1, scene, 6);
  ballSource.material = emissiveMaterial(puff.color);
  ballSource.isVisible = false;
  sources = { outer: cone('jetFlameOuter', flame.outer), inner: cone('jetFlameInner', flame.inner), puff: ballSource };
  for (let i = 0; i < puff.pool; i++) {
    const mesh = ballSource.createInstance('jetPuff');
    mesh.setEnabled(false);
    puffs.push({ mesh, life: 0, maxLife: 1, size: 1, vx: 0, vy: 0, vz: 0 });
  }
  return sources;
}

function acquireFlame() {
  const free = freeFlames.pop();
  if (free) {
    free.outer.setEnabled(true);
    free.inner.setEnabled(true);
    return free;
  }
  const { outer, inner } = ensureSources();
  const made = { outer: outer.createInstance('jetFlame'), inner: inner.createInstance('jetFlameCore') };
  made.outer.rotationQuaternion = new Quaternion();
  made.inner.rotationQuaternion = new Quaternion();
  return made;
}

function releaseFlame(f) {
  f.outer.setEnabled(false);
  f.inner.setEnabled(false);
  freeFlames.push(f);
}

// Một quả khí ở (x, y, z) trôi theo hướng `d` (vector đơn vị chỉ ra sau), `size` nhân kích thước (người hoá to / nhỏ).
function spawnPuff(x, y, z, d, size) {
  ensureSources();
  const p = puffs[nextPuff];
  nextPuff = (nextPuff + 1) % puffs.length;
  p.life = p.maxLife = puff.life;
  p.size = puff.size * size;
  p.vx = d.x * puff.speed + (Math.random() - 0.5);
  p.vy = d.y * puff.speed + (Math.random() - 0.5);
  p.vz = d.z * puff.speed + (Math.random() - 0.5);
  p.mesh.position.set(x, y, z);
  p.mesh.scaling.setAll(p.size);
  p.mesh.setEnabled(true);
}

// Jet `jet` (từ nhân vật có `root`) phun trong `durationMs` ms, lửa chĩa ra sau theo `back` {x, y, z} (đơn vị, ngược hướng dash).
// Dash xong còn lơ lửng thì liệng thêm tối đa `glideMs` ms: động cơ vẫn chạy, lửa nhỏ lại và chĩa xuống đất, tắt dần khi chân chạm đất.
export function startJetFx(jet, root, back, durationMs, glideMs = 0) {
  if (!jet || jet.disposed || jet.fans.length === 0) return;
  let entry = entries.find((e) => e.jet === jet);
  if (!entry) {
    entry = { jet, root, left: 0, glideSec: 0, gliding: false, quat: new Quaternion(), trail: { x: 0, y: 0, z: 0 }, flames: jet.fans.map(acquireFlame), puffIn: 0 };
    entries.push(entry);
  }
  entry.glideSec = glideMs / 1000;
  entry.left = durationMs / 1000 + entry.glideSec + flame.tail;
  entry.gliding = false;
  aimFlames(entry, back);
  jet.setSpin(true);
}

function aimFlames(entry, back) {
  Object.assign(entry.trail, back);
  Quaternion.FromUnitVectorsToRef(Vector3.Up(), trailVector.set(back.x, back.y, back.z), entry.quat);
}

// Hết đoạn dash thì chuyển sang liệng (lửa chĩa xuống); chân chạm đất thì cho ngọn lửa tắt dần thay vì chờ hết thời gian ước tính.
function updatePhase(entry) {
  if (!entry.gliding && entry.glideSec > 0 && entry.left <= entry.glideSec + flame.tail) {
    entry.gliding = true;
    aimFlames(entry, DOWN);
  }
  if (!entry.gliding || entry.left <= flame.tail) return;
  const { x, y, z } = entry.root.position;
  if (y <= groundAt(x, z, y) + GROUNDED) entry.left = flame.tail;
}

function finish(entry) {
  entry.flames.forEach(releaseFlame);
  if (!entry.jet.disposed) entry.jet.setSpin(false);
}

function drawFlames(entry) {
  const size = entry.root.scaling.x * (entry.gliding ? flame.glide : 1);
  const fade = Math.min(1, entry.left / flame.tail); // hạ cánh xong thì ngọn lửa co dần rồi tắt
  const width = flame.width * size * fade;
  const { fans, disposed } = entry.jet;
  for (let i = 0; i < fans.length && !disposed; i++) {
    const at = fans[i].getAbsolutePosition();
    const length = flame.length * size * fade * (1 + (Math.random() - 0.5) * flame.flicker);
    const f = entry.flames[i];
    f.outer.position.copyFrom(at);
    f.inner.position.copyFrom(at);
    f.outer.rotationQuaternion.copyFrom(entry.quat);
    f.inner.rotationQuaternion.copyFrom(entry.quat);
    f.outer.scaling.set(width, length, width);
    f.inner.scaling.set(width * 0.5, length * 0.65, width * 0.5);
  }
}

function emitPuffs(entry, dt) {
  entry.puffIn -= dt;
  if (entry.puffIn > 0 || entry.left <= flame.tail) return;
  entry.puffIn += puff.interval;
  const fans = entry.jet.fans;
  const at = fans[Math.floor(Math.random() * fans.length)].getAbsolutePosition();
  spawnPuff(at.x, at.y, at.z, entry.trail, entry.root.scaling.x);
}

// Khí cho chính mình lúc dash: động cơ nằm sau lưng nên không thấy, chỉ để lại vệt khí trong không trung ở chỗ vừa bay qua.
export function emitLocalTrail(dt, x, y, z, back) {
  localPuffIn -= dt;
  if (localPuffIn > 0) return;
  localPuffIn = puff.interval;
  spawnPuff(x, y, z, back, 1);
}

// Mỗi khung hình: ngọn lửa bám cánh quạt, nhả khí, khí trôi và co lại. Không cấp phát gì.
export function updateJetFx(dt) {
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    entry.left -= dt;
    if (entry.jet.disposed || entry.left <= 0) {
      finish(entry);
      entries.splice(i, 1);
      continue;
    }
    updatePhase(entry);
    drawFlames(entry);
    emitPuffs(entry, dt);
  }
  for (const p of puffs) {
    if (p.life <= 0) continue;
    p.life -= dt;
    if (p.life <= 0) {
      p.mesh.setEnabled(false);
      continue;
    }
    p.mesh.position.x += p.vx * dt;
    p.mesh.position.y += p.vy * dt;
    p.mesh.position.z += p.vz * dt;
    p.mesh.scaling.setAll(p.size * (p.life / p.maxLife));
  }
}

// Dùng thử một ngọn lửa và một quả khí ở chỗ không ai thấy để shader biên dịch trước (xem warmup.js).
export function prepareJetFx(farBelow) {
  const f = acquireFlame();
  f.outer.position.set(0, farBelow, 0);
  f.inner.position.set(0, farBelow, 0);
  f.outer.scaling.setAll(1);
  f.inner.scaling.setAll(1);
  spawnPuff(0, farBelow, 0, Vector3.Zero(), 1);
  setTimeout(() => releaseFlame(f), 600);
}
