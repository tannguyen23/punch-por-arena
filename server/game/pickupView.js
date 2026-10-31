const { PLANE_SPEED } = require('../config');

// Tách riêng khỏi pickups.js để loot.js (được damage.js nạp) dùng được mà không require vòng qua pickups.js.

// Vật nhặt gửi cho client: thời điểm đổi sang "còn bao lâu" (âm = đã qua) để client tự tính theo đồng hồ của mình.
// Máy bay đi qua (x, z) ở độ cao `y` theo hướng `heading` đúng lúc thả, hòm rơi dù thẳng xuống.
// `planePath` là đường bay chung của cả chuyến: { id, from, startIn, y, speed, drops: [{ x, z, in }] } — client vẽ MỘT máy bay
// đi lần lượt qua các điểm thả (mỗi hòm vẫn là một vật nhặt riêng). `firstDrop`: hòm đầu của chuyến.
// `dropped`: vũ khí rơi ra sân hoặc lọ thuốc (nằm sẵn dưới đất, không có máy bay / hòm / khói); `potion`: lọ thuốc (thay cho `weapon`).
// `bonus`: id lựu đạn thưởng kèm trong hòm (client dựng thêm model cạnh vũ khí chính).
function pickupView(pickup, now = Date.now()) {
  const { id, weapon, potion, ammo, x, z, y, heading, dropped, firstDrop, smokeKind, planePath } = pickup;
  return {
    id, weapon, potion, ammo, x, z, y, heading, dropped, firstDrop, smokeKind,
    ...(planePath ? {
      planePath: {
        id: planePath.id,
        from: planePath.from,
        startIn: planePath.startAt - now,
        y: planePath.y,
        speed: planePath.speed,
        drops: planePath.drops.map((d) => ({ x: d.x, z: d.z, in: d.at - now })),
      },
    } : {}),
    bonus: pickup.bonus?.weapon,
    speed: PLANE_SPEED,
    releaseIn: pickup.releaseAt - now,
    landIn: pickup.landsAt - now,
  };
}

module.exports = { pickupView };
