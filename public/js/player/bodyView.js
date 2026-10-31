import { scene } from '../core/scene.js';
import { state } from '../state.js';
import { groundAt } from '../core/terrain.js';
import { createModelAvatar } from '../entities/character.js';
import { settings } from '../settings.js';
import { eyeHeight } from './aim.js';
import { BODY_VIEW, AIRBORNE_HEIGHT, JUMP_AIR_TIME, PITCH_LIMIT } from '../config.js';

// Thân dưới của mình ở góc nhìn thứ nhất: một nhân vật model nữa đứng đúng chỗ mình đứng, chỉ hiện quần và giày (BODY_VIEW.meshes).
// Đầu, thân trên, tay đều ẩn (tay đã có ở player/viewmodel.js) và không cầm vũ khí. Nó nằm trong `root` nên co giãn theo state.size:
// uống thuốc rồi nhìn xuống là thấy đôi chân to / nhỏ ngay.

let avatar = null;
let look = null;
let phase = 0; // pha bước chân, tăng theo quãng đường đi
let last = null; // vị trí khung trước để tính tốc độ

// Ngoại hình đã chọn (gọi từ viewmodel.js cùng lúc với tay). Không cần ảnh mặt vì đầu bị ẩn.
export function setBodyViewLook(value) {
  look = { ...value, face: undefined };
}

// Dựng khi model đã nạp xong (chưa thì thử lại khung sau).
function ensureAvatar() {
  if (avatar || !BODY_VIEW.enabled || !look) return;
  const created = createModelAvatar(scene, 'meBody', look, { jetpack: false });
  if (!created) return;
  for (const mesh of created.root.getChildMeshes(false)) {
    // isVisible chứ không setEnabled: tắt một khối là tắt luôn mọi khối con, mà `__root__` của file .glb chứa cả nhân vật.
    if (!BODY_VIEW.meshes.includes(mesh.name)) mesh.isVisible = false;
    // Ống quần hở đầu trên: bỏ mặt trong để nhìn từ trên xuống không thấy lòng ống quần mà thấy xuyên qua tới đất.
    else if (mesh.material) mesh.material.backFaceCulling = true;
  }
  avatar = created;
}

// Chân đặt cách mắt bao xa (mét, dương là ra trước) để bàn chân vừa chạm mép dưới màn hình khi cúi xuống tối đa: chỉ lấp ló chút bàn chân và ống chân,
// đủ để cảm nhận kích thước mà không chắn tầm nhìn. Bàn chân nằm dưới đường chân trời của mắt một góc `PITCH_LIMIT + feetEdge × nửa FOV dọc`,
// mắt cao `eyeHeight()` nên khoảng ngang = cao / tan(góc); góc trên 90° thì âm = chân nằm lùi sau mắt. Cao theo kích thước và ngồi nên
// chân tự co giãn đúng; theo FOV cài đặt (không tính phần giãn khi chạy) nên bàn chân luôn ở mép dưới dù FOV rộng hay hẹp.
function feetOffset() {
  return eyeHeight() / Math.tan(PITCH_LIMIT + (BODY_VIEW.feetEdge * settings.fov) / 2);
}

// Gọi mỗi khung hình sau khi camera đã cập nhật.
export function updateBodyView(dt) {
  ensureAvatar();
  if (!avatar) return;
  const show = state.alive && !state.dog && !state.spectator; // chó có hình riêng, người chết thì không còn chân; camera khán giả bay tự do
  avatar.root.setEnabled(show);
  if (!show) {
    last = null;
    return;
  }
  const { me, size } = state;
  const speed = last && dt > 0 ? Math.hypot(me.x - last.x, me.z - last.z) / dt : 0;
  last = { x: me.x, z: me.z };
  phase += (speed / Math.sqrt(size)) * dt * BODY_VIEW.stepRate;

  const ahead = feetOffset();
  avatar.root.position.set(me.x + Math.sin(state.yaw) * ahead, me.y, me.z + Math.cos(state.yaw) * ahead);
  avatar.root.rotation.y = state.yaw;
  avatar.root.scaling.setAll(size);

  avatar.setAirborne(me.y > groundAt(me.x, me.z, me.y) + AIRBORNE_HEIGHT, JUMP_AIR_TIME);
  avatar.setRunning(state.sprinting);
  avatar.update(dt);
  avatar.pose(state.crouchAmount, Math.sin(phase) * 0.7 * Math.min(speed / 3, 1) * (1 - 0.7 * state.crouchAmount));
}
