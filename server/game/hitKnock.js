const { MELEE_KNOCK } = require('../config');
const { send } = require('../net/messaging');

// Đòn cận chiến trúng thì đẩy nạn nhân lùi nhẹ ra xa người đánh cho có "trọng lượng". Vị trí do client quyết định nên server chỉ gửi vận tốc
// (tin 'knockback', cùng đường với đấm trời giáng), máy nạn nhân tự trượt đi. Không có `vy` để không cắt cú rơi / nhảy đang diễn ra.
function knockFromMelee(attacker, target, damage) {
  const dx = target.x - attacker.x;
  const dz = target.z - attacker.z;
  const len = Math.hypot(dx, dz) || 1;
  const speed = Math.min(MELEE_KNOCK.max, MELEE_KNOCK.base + MELEE_KNOCK.perDamage * damage);
  send(target.ws, { t: 'knockback', vx: +((dx / len) * speed).toFixed(2), vz: +((dz / len) * speed).toFixed(2) });
}

module.exports = { knockFromMelee };
