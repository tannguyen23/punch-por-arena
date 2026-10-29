const { POTION, EVENTS } = require('../config');
const { broadcast } = require('../net/messaging');
const { randomPotion } = require('./potions');
const { pickupView, findPickupPosition } = require('./pickups');

// Thuốc xuất hiện thẳng trên sân (không máy bay, hòm, khói) theo lịch riêng, tách khỏi hòm tiếp tế vì không đi vào túi đồ.
// Dùng chung bản đồ `room.pickups` với vũ khí (có trường `potion` thay cho `weapon`) nên người vào giữa chừng, dọn sân, nhặt
// đều đi chung đường cũ. `dropped: true` để client dựng đúng kiểu "nằm sẵn dưới đất".
function spawnPotion(room, now) {
  const pos = findPickupPosition(room);
  const pickup = {
    id: room.nextPickupId++,
    potion: randomPotion(),
    x: +pos.x.toFixed(2),
    z: +pos.z.toFixed(2),
    y: +room.terrain.heightAt(pos.x, pos.z).toFixed(2),
    heading: 0,
    releaseAt: now,
    landsAt: now,
    dropped: true,
  };
  room.pickups.set(pickup.id, pickup);
  broadcast(room, { t: 'potiondrop', pickup: pickupView(pickup, now) });
}

// Gọi mỗi nhịp khi đang 'playing'. Trên sân đã đủ lọ chưa ai nhặt thì bỏ lượt này. `paused`: sự kiện đang chạy ngưng thuốc rơi (events.js `isPaused`),
// tới hẹn thì dời hẹn thay vì rơi, để hết sự kiện mới tới lượt.
function runPotionDrops(room, now, paused = false) {
  if (now < room.nextPotionAt) return;
  if (paused) {
    room.nextPotionAt = now + EVENTS.retryMs;
    return;
  }
  room.nextPotionAt = now + POTION.intervalMs;
  const onField = [...room.pickups.values()].filter((pickup) => pickup.potion).length;
  if (onField < POTION.maxOnField) spawnPotion(room, now);
}

module.exports = { runPotionDrops };
