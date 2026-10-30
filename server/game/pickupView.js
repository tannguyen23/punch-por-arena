const { PLANE_SPEED } = require('../config');

// Tách riêng khỏi pickups.js để loot.js (được damage.js nạp) dùng được mà không require vòng qua pickups.js.

// Vật nhặt gửi cho client: thời điểm đổi sang "còn bao lâu" (âm = đã qua) để client tự tính theo đồng hồ của mình.
// Máy bay đi qua (x, z) ở độ cao `y` theo hướng `heading` (cùng quy ước với yaw) đúng lúc thả, hòm rơi dù thẳng xuống.
// `dropped`: vũ khí rơi ra sân hoặc lọ thuốc (nằm sẵn dưới đất, không có máy bay / hòm / khói); `potion`: lọ thuốc (thay cho `weapon`).
// `bonus`: id lựu đạn thưởng kèm trong hòm (client dựng thêm model cạnh vũ khí chính).
function pickupView(pickup, now = Date.now()) {
  const { id, weapon, potion, ammo, x, z, y, heading, dropped, smokeKind } = pickup;
  return {
    id, weapon, potion, ammo, x, z, y, heading, dropped, smokeKind,
    bonus: pickup.bonus?.weapon,
    speed: PLANE_SPEED,
    releaseIn: pickup.releaseAt - now,
    landIn: pickup.landsAt - now,
  };
}

module.exports = { pickupView };
