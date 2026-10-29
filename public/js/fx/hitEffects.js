import { state } from '../state.js';
import * as Fx from './effects.js';

// Tia lửa + ngôi sao ở ngực nạn nhân (lệch về phía người đấm cho dễ thấy) và số sát thương bay lên.
export function spawnHitEffects(target, attacker, damage) {
  const pos = target.root.position;
  const size = target.size ?? 1; // thuốc hoá to / nhỏ
  const dx = attacker.x - pos.x;
  const dz = attacker.z - pos.z;
  const len = Math.hypot(dx, dz) || 1;
  const x = pos.x + (dx / len) * 0.35 * size;
  const z = pos.z + (dz / len) * 0.35 * size;
  const y = pos.y + (1.3 - 0.35 * target.crouch) * size;
  Fx.burst(x, y, z, 12);
  Fx.flash(x, y, z);
  // Số sát thương dịch sang bên phải (theo góc nhìn của mình) để không bị thanh máu che
  Fx.damageText(
    pos.x + Math.cos(state.yaw) * 0.8 * size,
    pos.y + (1.8 - 0.35 * target.crouch) * size,
    pos.z - Math.sin(state.yaw) * 0.8 * size,
    `-${damage ?? 10}`,
  );
}
