const { DOG_EVENT } = require('../config');
const { stripInventory, clearInventory } = require('./inventory');
const { clearPotion } = require('./potions');
const { resetPoopSkill, tickPoop, clearPoops, poopsView, poopInfo } = require('./poop');

// Sự kiện "hoá chó": một người sống ngẫu nhiên thành chó (mất hết vũ khí, không đánh / nhặt được, client cho chạy nhanh hơn).
// Hạ được chó thì người hạ nhận tiền thưởng, chó chạy thoát tới hết giờ thì chính nó nhận. Vòng đời nằm ở events.js.


// Trả về trạng thái sự kiện, hoặc null nếu không có ai để hoá chó.
function begin(room) {
  const alive = [...room.players.values()].filter((p) => !p.dead);
  if (alive.length === 0) return null;
  const target = alive[Math.floor(Math.random() * alive.length)];
  target.dog = true;
  clearPotion(target); // hình chó có kích thước riêng, không cộng thêm thuốc
  resetPoopSkill(target);
  stripInventory(target);
  return { targetId: target.id, bounty: DOG_EVENT.bounty };
}

// Mỗi nhịp: trả về kết quả nếu sự kiện phải kết thúc (người chơi thoát, hết giờ), không thì undefined.
function tick(room, ev, now) {
  const target = room.players.get(ev.targetId);
  if (!target) return { reason: 'left' };
  tickPoop(target, now);
  if (now < ev.endsAt) return undefined;
  target.score += ev.bounty;
  return { reason: 'escaped', winner: target };
}

// Có người bị hạ (gọi từ applyDamage). Chó bị hạ bởi người khác: người đó nhận thưởng; chết vì sét / rơi / xương rồng thì không ai nhận.
function onDown(room, ev, target, attacker) {
  if (target.id !== ev.targetId) return undefined;
  if (!attacker || attacker === target) return { reason: 'died' };
  attacker.score += ev.bounty;
  return { reason: 'caught', winner: attacker };
}

// Trả lại hình người (vũ khí khởi đầu như sau khi hồi sinh). Gọi cả khi huỷ sự kiện.
function finish(room, ev) {
  clearPoops(room);
  const target = room.players.get(ev.targetId);
  if (!target) return;
  target.dog = false;
  target.poopCharges = 0;
  clearInventory(target);
}

// Kỹ năng thả shit của chó, và shit đang nằm trên sân cho người vào giữa chừng (thêm vào tin 'event').
const view = (room) => ({ poop: poopInfo(), poops: poopsView(room) });

// Mô tả cho trang /admin-test (debug/options.js): tên, số người tối thiểu để thử, các thông số thời gian chỉnh được (`apply` ghi vào config)
// và thời lượng tối đa = tổng `times × giá trị` của các thông số (không tính phần đứng hình đọc luật).
const debug = {
  name: 'Hoá chó',
  minPlayers: 1,
  options: [
    { key: 'run', label: 'Chó chạy trốn', default: 15, min: 3, max: 300, apply: (seconds) => { DOG_EVENT.durationMs = seconds * 1000; } },
  ],
  length: [{ key: 'run', times: 1 }],
};

module.exports = {
  get durationMs() { return DOG_EVENT.durationMs; }, // đọc lúc dùng: /admin-test đổi được khi server đang chạy
  begin, tick, onDown, finish, view, debug,
};
