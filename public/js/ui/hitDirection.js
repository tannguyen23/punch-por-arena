import { state } from '../state.js';
import { HIT_FX } from '../config.js';

// Chỉ báo hướng đòn: một vệt đỏ hiện ở viền màn hình, về phía người vừa đánh mình (ở trước thì nằm trên, bên phải thì nằm bên phải...).
// Dùng sẵn vài phần tử xoay vòng, mỗi lần hiện chạy một hoạt ảnh mờ dần (Web Animations), không dựng DOM mới mỗi lần trúng.
const WEDGES = 4;
const wedges = [];
let next = 0;

function ensure() {
  if (wedges.length) return;
  const host = document.getElementById('hit-dir');
  for (let i = 0; i < WEDGES; i++) {
    const el = document.createElement('div');
    host.appendChild(el);
    wedges.push(el);
  }
}

// (fromX, fromZ): chỗ người đánh. `power` 0–1 quyết định độ đậm.
export function showHitDirection(fromX, fromZ, power) {
  if (state.spectator || power < HIT_FX.indicator.minPower) return;
  const dx = fromX - state.me.x;
  const dz = fromZ - state.me.z;
  if (Math.hypot(dx, dz) < 0.05) return;
  ensure();
  // Hệ camera: phía trước = (sin yaw, cos yaw), bên phải = (cos yaw, -sin yaw). Góc đo theo chiều kim đồng hồ từ phía trên màn hình.
  const forward = dx * Math.sin(state.yaw) + dz * Math.cos(state.yaw);
  const right = dx * Math.cos(state.yaw) - dz * Math.sin(state.yaw);
  const angle = Math.atan2(right, forward);
  const el = wedges[next];
  next = (next + 1) % WEDGES;
  el.style.transform = `rotate(${angle}rad) translateY(-41vmin)`;
  el.animate([{ opacity: 0.45 + 0.55 * power }, { opacity: 0 }], { duration: HIT_FX.indicator.ms, easing: 'ease-out' });
}
