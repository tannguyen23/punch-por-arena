const { BIG_PUNCH } = require('../config');
const { broadcast, send } = require('../net/messaging');
const { POTIONS } = require('./potions');
const { cantAct, isFrozen, isTntCarrier, isStunned } = require('./restrictions');
const { applyDamage } = require('./damage');
const { wallBetween } = require('./raycast');
const { planLeap } = require('./bigLeap');

// "Đấm trời giáng" của người đang hoá to (thuốc có `bigPunch`, xem potions.js): giữ phím để gồng, thả ra thì nhảy vọt tới chỗ đang ngắm
// (bigLeap.js, xa nhất BIG_PUNCH.leap.maxRange) rồi đấm xuống: lúc chạm đất sóng xung kích nổ ra, đánh văng và gây sát thương mọi người
// trong bán kính, càng xa tâm càng nhẹ, gồng càng ngắn càng yếu (không có thời gian gồng tối thiểu). Dùng được cả khi đang cầm vũ khí, có hồi chiêu.
// Vị trí người chơi do client quyết định nên cú nhảy là client tự bay theo kế hoạch server gửi, còn đánh văng = gửi vận tốc cho máy của
// nạn nhân (tin 'knockback'), nó tự đẩy mình đi.

const canUse = (room, p) =>
  room.phase === 'playing' && !p.dead && !cantAct(room, p) && !isTntCarrier(room, p) && Boolean(POTIONS[p.potion?.id]?.bigPunch); // cầm vũ khí gì cũng dùng được

// Tin 'bigcharge': bắt đầu giữ phím. Mọi người trong phòng thấy tư thế lấy đà.
function startCharge(room, p) {
  if (p.bigChargeAt || Date.now() < p.bigPunchReadyAt || !canUse(room, p)) return;
  p.bigChargeAt = Date.now();
  broadcast(room, { t: 'bigcharge', id: p.id });
}

// Tin 'bigrelease' { yaw, pitch }: thả phím. Không còn dùng được, không tích lực hoặc không có chỗ rơi thì huỷ (không tốn hồi chiêu);
// còn lại nhảy ngay, sức mạnh theo thời gian đã gồng.
function releaseCharge(room, p, m) {
  const now = Date.now();
  const heldMs = p.bigChargeAt ? now - p.bigChargeAt : 0;
  p.bigChargeAt = 0;
  const aimed = Number.isFinite(m?.yaw) && Number.isFinite(m?.pitch);
  const plan = heldMs > 0 && aimed && canUse(room, p) ? planLeap(room, p, m.yaw, m.pitch) : null;
  if (!plan) {
    broadcast(room, { t: 'bigcancel', id: p.id }); // cũng gửi khi chẳng có lần tích lực nào: người khác đang kẹt ở tư thế lấy đà thì được gỡ
    return;
  }
  const charge = Math.min(1, heldMs / BIG_PUNCH.chargeMs);
  const power = BIG_PUNCH.minPower + (1 - BIG_PUNCH.minPower) * charge;
  p.yaw = m.yaw;
  p.bigPunchReadyAt = now + BIG_PUNCH.cooldownMs;
  const { flight, to, apex } = plan;
  p.leap = { from: flight.from, to, apex, endsAt: now + flight.duration };
  const pack = (v) => [v.x, v.y, v.z].map((n) => +n.toFixed(3));
  broadcast(room, { // cùng dạng với tin 'skillthrow': from / velocity / gravity / duration, cộng chỗ rơi và độ dài hoạt ảnh đấm
    t: 'bigpunch', id: p.id, from: pack(flight.from), velocity: pack(flight.velocity), gravity: +flight.gravity.toFixed(3), duration: flight.duration,
    to: pack(to), impactMs: BIG_PUNCH.impactMs, charge: +charge.toFixed(2),
  });
  setTimeout(() => impact(room, p, to, power), flight.duration);
}

// Sóng xung kích tại chỗ rơi `at`. Người trong bán kính (không bị tường chặn, không chênh độ cao quá `vertical`) mất máu và bị đẩy ra xa
// tâm; đứng đúng tâm thì bị đẩy theo hướng nhìn. `power` (0–1) nhân sát thương và lực đẩy.
function impact(room, p, at, power) {
  p.leap = null;
  if (room.phase !== 'playing' || room.players.get(p.id) !== p || p.dead || isFrozen(room) || isStunned(p) || p.tableId != null) return;
  const { radius, vertical, damage, edgeDamageMult, knockSpeed, edgeKnockMult, lift } = BIG_PUNCH;
  const forward = { x: Math.sin(p.yaw), z: Math.cos(p.yaw) };
  broadcast(room, { t: 'bigimpact', id: p.id, at: [at.x, at.y, at.z].map((v) => +v.toFixed(2)), r: radius });
  for (const o of [...room.players.values()]) {
    if (o === p || o.dead || o.tableId != null) continue;
    const dx = o.x - at.x;
    const dz = o.z - at.z;
    const dist = Math.hypot(dx, dz);
    if (dist > radius || Math.abs(o.y - at.y) > vertical || wallBetween(room, at, o)) continue;
    const far = dist / radius; // 0 ở tâm, 1 ở mép
    applyDamage(room, p, o, damage * power * (1 - (1 - edgeDamageMult) * far));
    if (o.dead) continue;
    const dir = dist > 0.3 ? { x: dx / dist, z: dz / dist } : forward;
    const speed = knockSpeed * power * (1 - (1 - edgeKnockMult) * far);
    send(o.ws, { t: 'knockback', vx: +(dir.x * speed).toFixed(2), vz: +(dir.z * speed).toFixed(2), vy: lift * power });
  }
}

module.exports = { startCharge, releaseCharge };
