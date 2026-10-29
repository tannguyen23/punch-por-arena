// Hiệu ứng của súng và tên lửa: lửa đầu nòng, vệt đạn, tia lửa chỗ đạn găm, vụ nổ.
import { scene } from '../core/scene.js';
import { VIEWMODEL, GUN_FX } from '../config.js';
import * as Fx from './effects.js';

const { MeshBuilder, StandardMaterial, Color3, Vector3 } = BABYLON;

function glowMaterial(name, color, alpha = 1) {
  const mat = new StandardMaterial(name, scene);
  mat.emissiveColor = color;
  mat.disableLighting = true;
  mat.alpha = alpha;
  return mat;
}

// Dùng chung cho mọi phát bắn; vệt đạn mờ dần bằng cách thu nhỏ chứ không đổi alpha (alpha nằm ở material chung).
const tracerMat = glowMaterial('tracer', new Color3(1, 0.9, 0.55), 0.85);
const muzzleMat = glowMaterial('muzzle', new Color3(1, 0.75, 0.3), 0.9);

// Vệt đạn: thanh mảnh nối hai điểm, co lại rất nhanh.
export function tracer(from, to) {
  const a = new Vector3(...from);
  const b = new Vector3(...to);
  const length = Vector3.Distance(a, b);
  if (length < 0.1) return;
  const mesh = MeshBuilder.CreateBox('tracer', { width: GUN_FX.tracerWidth, height: GUN_FX.tracerWidth, depth: length }, scene);
  mesh.material = tracerMat;
  mesh.position = Vector3.Center(a, b);
  mesh.lookAt(b);
  Fx.track({
    mesh,
    life: GUN_FX.tracerLife,
    max: GUN_FX.tracerLife,
    step(dt, k) {
      mesh.scaling.x = mesh.scaling.y = Math.max(1 - k, 0.001);
    },
  });
}

// Lửa đầu nòng: hai tấm sáng chéo nhau loé lên rồi tắt. `overlay`: vẽ đè như tay góc nhìn thứ nhất (không bị tường che).
export function muzzleFlash(x, y, z, size = 0.35, overlay = false) {
  const mesh = MeshBuilder.CreatePlane('muzzle', { size }, scene);
  mesh.material = muzzleMat;
  mesh.position.set(x, y, z);
  mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  mesh.rotation.z = Math.random() * Math.PI;
  if (overlay) mesh.renderingGroupId = VIEWMODEL.renderingGroup;
  Fx.track({
    mesh,
    life: GUN_FX.muzzleLife,
    max: GUN_FX.muzzleLife,
    step(dt, k) {
      mesh.scaling.setAll(Math.max(1 - k * k, 0.001));
    },
  });
}

// Đạn găm vào tường / đất.
export function bulletImpact([x, y, z]) {
  Fx.burst(x, y, z, 5, 0.6);
}

// Lựu đạn choáng nổ: quả cầu trắng loé rất sáng rồi tắt nhanh (không có lửa).
export function flashBurst([x, y, z]) {
  const mat = glowMaterial('flashBurst', new Color3(1, 1, 1), 1);
  const ball = MeshBuilder.CreateSphere('flashBurst', { diameter: 1, segments: 10 }, scene);
  ball.material = mat;
  ball.position.set(x, y, z);
  Fx.track({
    mesh: ball,
    ownMaterial: true,
    life: GUN_FX.flashBurstLife,
    max: GUN_FX.flashBurstLife,
    step(dt, k) {
      ball.scaling.setAll(Math.max(GUN_FX.flashBurstSize * Math.sqrt(k), 0.001));
      mat.alpha = 1 - k;
    },
  });
  Fx.burst(x, y, z, 10, 1.2);
}

// Vụ nổ bán kính `radius`: quả cầu lửa phình ra rồi mờ đi, kèm tia lửa và ngôi sao.
export function explosion([x, y, z], radius) {
  const mat = glowMaterial('boom', new Color3(1, 0.55, 0.15), 0.85);
  const ball = MeshBuilder.CreateSphere('boom', { diameter: 1, segments: 12 }, scene);
  ball.material = mat;
  ball.position.set(x, y, z);
  Fx.track({
    mesh: ball,
    ownMaterial: true,
    life: GUN_FX.explosionLife,
    max: GUN_FX.explosionLife,
    step(dt, k) {
      ball.scaling.setAll(Math.max(radius * 2 * Math.sqrt(k), 0.001));
      mat.alpha = 0.85 * (1 - k);
      mat.emissiveColor.g = 0.55 * (1 - k) + 0.15;
    },
  });
  Fx.burst(x, y, z, 28, 2);
  Fx.flash(x, y, z, radius);
}
