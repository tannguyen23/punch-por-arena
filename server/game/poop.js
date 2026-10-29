const { DOG_EVENT, PLAYER_RADIUS } = require('../config');
const { broadcast, send } = require('../net/messaging');
const { isFrozen } = require('./restrictions');
const { radiusOf } = require('./potions');

// Kỹ năng "thả shit" của con chó trong sự kiện hoá chó (dogEvent.js): bấm Q thả một cục sau lưng, tích trữ tối đa `max` cục và hồi dần
// một cục mỗi `rechargeMs`. Người săn (không phải chó) bước vào cục shit thì cục biến mất, họ bị chậm `slowMs` và bị che tầm nhìn (client lo
// phần đó qua tin 'poophit', server không kiểm tốc độ). Nhảy qua được (cao hơn cục shit quá `jumpClear` mét thì không dính).
// Shit nằm ở `room.poops`; hết sự kiện thì dọn sạch (clearPoops).
const POOP = DOG_EVENT.poop;

// Đầu sự kiện: chó có đủ cục.
function resetPoopSkill(p) {
  p.poopCharges = POOP.max;
  p.poopNextAt = 0;
  p.lastPoopAt = 0;
}

// Mỗi nhịp của sự kiện: hồi thêm cục khi tới hẹn.
function tickPoop(p, now) {
  if (p.poopCharges >= POOP.max || now < p.poopNextAt) return;
  p.poopCharges++;
  p.poopNextAt = p.poopCharges < POOP.max ? now + POOP.rechargeMs : 0;
}

// Tin 'poop': chó thả một cục sau lưng (cách chân 0.5 mét ngược hướng nhìn).
function handlePoop(room, p) {
  const now = Date.now();
  if (!p.dog || p.dead || room.phase !== 'playing' || isFrozen(room)) return;
  if (p.poopCharges <= 0 || now - p.lastPoopAt < POOP.gapMs) return;
  if (p.poopCharges === POOP.max) p.poopNextAt = now + POOP.rechargeMs; // vừa rời mức đầy thì bắt đầu đếm hồi
  p.poopCharges--;
  p.lastPoopAt = now;
  const poop = {
    id: room.nextPoopId++,
    x: +(p.x - Math.sin(p.yaw) * 0.5).toFixed(2),
    z: +(p.z - Math.cos(p.yaw) * 0.5).toFixed(2),
    y: +p.y.toFixed(2),
  };
  room.poops.set(poop.id, poop);
  broadcast(room, { t: 'poop', poop });
}

// Gọi mỗi lần nhận vị trí của `p` (movement.js): dính shit thì cục biến mất, người đó nhận lệnh bị chậm.
function checkPoopContact(room, p) {
  if (room.poops.size === 0 || room.phase !== 'playing' || p.dead || p.dog || isFrozen(room)) return;
  const reach = POOP.radius + radiusOf(p) - PLAYER_RADIUS; // người to đạp trúng từ xa hơn
  for (const poop of room.poops.values()) {
    if (Math.hypot(poop.x - p.x, poop.z - p.z) >= reach || p.y - poop.y > POOP.jumpClear) continue;
    room.poops.delete(poop.id);
    broadcast(room, { t: 'poopgone', id: poop.id, by: p.id });
    send(p.ws, { t: 'poophit', ms: POOP.slowMs });
  }
}

const poopsView = (room) => [...room.poops.values()];
const poopInfo = () => ({ max: POOP.max, rechargeMs: POOP.rechargeMs });

// Hết sự kiện: bỏ hết shit còn trên sân (client dọn theo tin 'eventEnd').
const clearPoops = (room) => room.poops.clear();

module.exports = { resetPoopSkill, tickPoop, handlePoop, checkPoopContact, poopsView, poopInfo, clearPoops };
