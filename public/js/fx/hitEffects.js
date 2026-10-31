import { state } from '../state.js';
import { HIT_FX } from '../config.js';
import * as Fx from './effects.js';

const lerp = ([min, max], t) => min + (max - min) * t;

// Sức nặng của cú đánh, 0–1 (tay không ≈ 0.17, kiếm ≈ 0.6, đòn từ 60 sát thương trở lên = 1).
export const hitPower = (damage) => Math.min(1, Math.max(0, (damage ?? 10) / HIT_FX.fullDamage));

function tierOf(damage) {
  let tier = HIT_FX.tiers[0];
  for (const t of HIT_FX.tiers) if ((damage ?? 0) >= t.min) tier = t;
  return tier;
}

// Cú trúng ở ngực nạn nhân (lệch về phía người đánh cho dễ thấy): tia lửa, ngôi sao, vòng sóng va chạm, bụi và số sát thương bay lên.
// Mọi thứ to / nhiều hơn theo sức nặng của đòn; `ko` (đòn hạ gục) thêm một đợt tia lửa + bụi và số to, đỏ.
export function spawnHitEffects(target, attacker, damage, ko = false) {
  const power = hitPower(damage);
  const pos = target.root.position;
  const size = target.size ?? 1; // thuốc hoá to / nhỏ
  const dx = attacker.x - pos.x;
  const dz = attacker.z - pos.z;
  const len = Math.hypot(dx, dz) || 1;
  const x = pos.x + (dx / len) * 0.35 * size;
  const z = pos.z + (dz / len) * 0.35 * size;
  const y = pos.y + (1.3 - 0.35 * target.crouch) * size;
  Fx.burst(x, y, z, Math.round(lerp(HIT_FX.sparks, power)) + (ko ? HIT_FX.ko.extraSparks : 0));
  Fx.flash(x, y, z, size * (1 + 0.5 * power));
  Fx.ring(x, y, z, lerp(HIT_FX.ring.size, power) * size, HIT_FX.ring.life);
  if (power >= HIT_FX.dustMinPower || ko) Fx.dust(x, y - 0.25 * size, z, Math.round(lerp(HIT_FX.dust, power)) + (ko ? HIT_FX.ko.extraDust : 0), size);
  // Số sát thương dịch sang bên phải (theo góc nhìn của mình) để không bị thanh máu che
  const tier = ko ? HIT_FX.koTier : tierOf(damage);
  Fx.damageText(
    pos.x + Math.cos(state.yaw) * 0.8 * size,
    pos.y + (1.8 - 0.35 * target.crouch) * size,
    pos.z - Math.sin(state.yaw) * 0.8 * size,
    `-${damage ?? 10}`,
    tier.color,
    tier.scale,
  );
}
