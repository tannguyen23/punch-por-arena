// Điều kiện chặn hành động chung cho combat / shooting / grenades / drops / radioCall / pickups. Không require file nào khác của game
// để các file đó dùng được mà không tạo import vòng.

// Đang đứng hình (phần mở đầu của sự kiện, xem events.js): không ai di chuyển, đánh, nhặt hay nhận sát thương.
const isFrozen = (room, now = Date.now()) => now < room.frozenUntil;

// Sự kiện solo đang chạy (duelEvent.js), hoặc null. `ev.fighters` = id hai võ sĩ, `ev.fighting` = đang trong hiệp đấu.
const duelOf = (room) => (room.event?.kind === 'duel' ? room.event : null);

const isDuelFighter = (room, p) => duelOf(room)?.fighters.includes(p.id) ?? false;

// Võ sĩ ngoài hiệp đấu (đang cược / nghỉ giữa hiệp): đứng yên tại chỗ, server bỏ qua vị trí client báo.
const isHeld = (room, p) => isDuelFighter(room, p) && !duelOf(room).fighting;

// Không được đánh / bắn / ném / vứt / nhặt: đang đứng hình, đang hoá chó (chỉ được chạy), hoặc trong sự kiện solo mà không phải võ sĩ đang trong hiệp.
const cantAct = (room, p) => {
  const duel = duelOf(room);
  return p.dog || isFrozen(room) || (duel !== null && !(duel.fighting && duel.fighters.includes(p.id)));
};

// Võ sĩ chỉ bị thương bởi đòn của đối thủ trong hiệp: sét, bom, đạn lạc, rơi... đều vô hiệu để trận solo công bằng.
function shieldedFromDamage(room, attacker, target) {
  const duel = duelOf(room);
  if (!duel || !duel.fighters.includes(target.id)) return false;
  return !(duel.fighting && attacker && attacker !== target && duel.fighters.includes(attacker.id));
}

module.exports = { isFrozen, cantAct, isDuelFighter, isHeld, shieldedFromDamage };
