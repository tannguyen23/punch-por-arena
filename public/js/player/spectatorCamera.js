// Chế độ khán giả (?mode=spectator, xem ui/spectatorHud.js): camera bay tự do để quay phim trận đấu.
// Vẫn dùng camera chung vì nhiều thứ (tay, súng, hiệu ứng) gắn vào nó; khác chế độ chơi ở chỗ camera không bám người chơi.
// WASD bay theo hướng nhìn, Space lên, Shift xuống; chuột nhìn (player/localPlayer.js `look`).
import { state } from '../state.js';
import { keys } from '../core/keys.js';
import { camera } from './camera.js';
import { SPECTATOR } from '../config.js';

const pos = { x: 0, y: 0, z: 0 };
const vel = { x: 0, y: 0, z: 0 };
let resetFor = ''; // phòng + cỡ sân lúc đặt lại camera; vào phòng mới / đổi map thì đặt lại

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Vào phòng mới: đứng ở tâm sân, cao đủ thấy trọn map, nhìn gần thẳng xuống.
function reset() {
  pos.x = 0;
  pos.y = (state.arena / Math.tan(SPECTATOR.fov / 2)) * SPECTATOR.overviewMargin;
  pos.z = 0;
  vel.x = vel.y = vel.z = 0;
  state.yaw = 0;
  state.pitch = SPECTATOR.pitchLimit;
}

export function updateSpectatorCamera(dt) {
  if (state.room) {
    const key = `${state.room.code}|${state.arena}`;
    if (key !== resetFor) {
      resetFor = key;
      reset();
    }
  }

  const forward = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
  const strafe = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
  const up = (keys.has('Space') ? 1 : 0) - (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 1 : 0);
  const sin = Math.sin(state.yaw);
  const cos = Math.cos(state.yaw);
  const speed = SPECTATOR.speed;
  const targetX = (sin * forward + cos * strafe) * speed;
  const targetZ = (cos * forward - sin * strafe) * speed;
  const targetY = up * speed;

  const ease = 1 - Math.exp(-SPECTATOR.accel * dt); // bay nhanh dần / dừng lại mượt thay vì giật
  vel.x += (targetX - vel.x) * ease;
  vel.y += (targetY - vel.y) * ease;
  vel.z += (targetZ - vel.z) * ease;

  const edge = state.arena * SPECTATOR.margin;
  pos.x = clamp(pos.x + vel.x * dt, -edge, edge);
  pos.z = clamp(pos.z + vel.z * dt, -edge, edge);
  pos.y = clamp(pos.y + vel.y * dt, SPECTATOR.minHeight, SPECTATOR.maxHeight);

  camera.fov = SPECTATOR.fov;
  camera.position.set(pos.x, pos.y, pos.z);
  camera.rotation.set(state.pitch, state.yaw, 0);
  state.shake = 0; // rung (trúng đòn / bom) không có tác dụng với camera bay
}
