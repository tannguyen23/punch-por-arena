// Điều kiện chặn hành động chung cho combat / shooting / grenades / drops / radioCall / pickups. Không require file nào khác của game
// để các file đó dùng được mà không tạo import vòng.

// Đang đứng hình (phần mở đầu của sự kiện, xem events.js): không ai di chuyển, đánh, nhặt hay nhận sát thương.
const isFrozen = (room, now = Date.now()) => now < room.frozenUntil;
const isTntCarrier = (room, p) => room?.event?.kind === 'tnt' && room.event.targetId === p.id;
const isStunned = (p, now = Date.now()) => now < (p.stunnedUntil ?? 0);

// Sự kiện solo đang chạy (duelEvent.js), hoặc null. `ev.fighters` = id hai võ sĩ, `ev.fighting` = đang trong hiệp đấu.
const duelOf = (room) => (room.event?.kind === 'duel' ? room.event : null);

const isDuelFighter = (room, p) => duelOf(room)?.fighters.includes(p.id) ?? false;
const sameDuelTeam = (room, a, b) => duelOf(room)?.teams.some((ids) => ids.includes(a.id) && ids.includes(b.id)) ?? false;

// Người chơi cờ và võ sĩ ngoài hiệp đấu đứng yên tại chỗ, server bỏ qua vị trí client báo.
const isHeld = (room, p) => isStunned(p) || p.tableId != null || (isDuelFighter(room, p) && !duelOf(room).fighting);

// Không được đánh / bắn / ném / vứt / nhặt khi chơi cờ, đứng hình, hoá chó hoặc là người xem solo.
const cantAct = (room, p) => {
  const duel = duelOf(room);
  return isStunned(p) || p.tableId != null || p.dog || isFrozen(room) || (duel !== null && !(duel.fighting && duel.fighters.includes(p.id)));
};

// TNT miễn mọi sát thương trừ vụ nổ kết thúc; võ sĩ chỉ bị thương bởi đối thủ trong hiệp.
function shieldedFromDamage(room, attacker, target, source = null) {
  const ev = room.event;
  if (ev?.kind === 'tnt') {
    return !(source === 'tnt' && ev.exploded && ev.targetId === target.id && attacker === null);
  }
  if (target.tableId != null) return true;
  const duel = duelOf(room);
  if (!duel || !duel.fighters.includes(target.id)) return false;
  return !(duel.fighting && attacker && attacker !== target && duel.fighters.includes(attacker.id) && !sameDuelTeam(room, attacker, target));
}

module.exports = { isFrozen, cantAct, isDuelFighter, isHeld, shieldedFromDamage, isTntCarrier, isStunned, sameDuelTeam };
