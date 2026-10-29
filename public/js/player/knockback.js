import { state } from '../state.js';
import { groundAt } from '../core/terrain.js';
import { KNOCKBACK } from '../config.js';

const AIR_EPSILON = 0.05; // chân cao hơn đất ngần này (mét) là đang ở trên không

// Bị đánh văng (tin 'knockback' từ server, xem net/bigPunchHandlers.js). Vị trí do client quyết định nên server chỉ gửi vận tốc, ta tự đẩy
// mình đi và để đà tan dần: nhanh khi chạm đất (ma sát), chậm khi còn bay trên không. Vẫn bấm đi được trong lúc bị văng; va chạm tường,
// vật cản xử lý sau như bình thường (resolveCollisions) nên văng vào tường thì dừng lại.
export function addKnockback(vx, vz) {
  state.knock.x += vx;
  state.knock.z += vz;
}

export function resetKnockback() {
  state.knock.x = 0;
  state.knock.z = 0;
}

// Gọi mỗi khung hình khi còn sống (kể cả lúc đứng hình, để không mất đà).
export function applyKnockback(dt) {
  const { knock, me } = state;
  if (knock.x === 0 && knock.z === 0) return;
  me.x += knock.x * dt;
  me.z += knock.z * dt;
  const airborne = me.y > groundAt(me.x, me.z, me.y) + AIR_EPSILON;
  const keep = Math.exp(-(airborne ? KNOCKBACK.airFriction : KNOCKBACK.groundFriction) * dt);
  knock.x *= keep;
  knock.z *= keep;
  if (Math.hypot(knock.x, knock.z) < KNOCKBACK.stopSpeed) resetKnockback();
}
