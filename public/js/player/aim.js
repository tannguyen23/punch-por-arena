import { state } from '../state.js';
import { EYE_HEIGHT, CROUCH_EYE_HEIGHT, MUZZLE_OFFSET, DOG } from '../config.js';

// Độ cao mắt so với chân (hạ dần khi ngồi xuống, nhân với kích thước khi uống thuốc: server tính điểm bắn y như vậy, chỉ khác là
// `state.size` đổi mượt trong khoảng một giây còn server đổi ngay).
export const eyeHeight = () =>
  state.dog ? DOG.eyeHeight : (EYE_HEIGHT + (CROUCH_EYE_HEIGHT - EYE_HEIGHT) * state.crouchAmount) * state.size;

// Ba trục của camera theo yaw/pitch (pitch dương là nhìn xuống), cùng cách server tính hướng bắn.
export function aimAxes(yaw = state.yaw, pitch = state.pitch) {
  const sy = Math.sin(yaw);
  const cy = Math.cos(yaw);
  const sp = Math.sin(pitch);
  const cp = Math.cos(pitch);
  return {
    forward: { x: sy * cp, y: -sp, z: cy * cp },
    right: { x: cy, y: 0, z: -sy },
    up: { x: sy * sp, y: cp, z: cy * sp },
  };
}

// Chỗ đầu nòng súng của mình trong thế giới: lấy từ súng đang hiện ở góc nhìn thứ nhất (player/gunView.js ghi vào state.muzzle),
// chưa có thì ước lượng: lệch khỏi mắt sang phải, xuống dưới và ra trước.
export function muzzlePosition() {
  if (state.muzzle) return state.muzzle;
  const { forward, right, up } = aimAxes();
  const { right: r, down: d, forward: f } = MUZZLE_OFFSET;
  const eye = { x: state.me.x, y: state.me.y + eyeHeight(), z: state.me.z };
  return {
    x: eye.x + right.x * r - up.x * d + forward.x * f,
    y: eye.y + right.y * r - up.y * d + forward.y * f,
    z: eye.z + right.z * r - up.z * d + forward.z * f,
  };
}
