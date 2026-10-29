const { obstacleDistance, eyeOf } = require('./raycast');

const LIFT = 0.25; // dò tầm nhìn từ hơi cao hơn quả lựu đạn để mặt đất ngay dưới nó không tính là vật che

// Ai thấy được vụ nổ của lựu đạn choáng tại `at` trong bán kính `radius`: đường từ quả nổ tới mắt không bị tường / đồi che.
// Trả về [[id, mức độ]] với mức độ 1 ở sát quả nổ, giảm dần về 0 ở mép. Hướng nhìn do client tự tính (server không biết pitch).
function flashTargets(room, at, radius) {
  const from = { x: at.x, y: at.y + LIFT, z: at.z };
  const hits = [];
  for (const o of room.players.values()) {
    if (o.dead) continue;
    const eye = eyeOf(o);
    const d = { x: eye.x - from.x, y: eye.y - from.y, z: eye.z - from.z };
    const dist = Math.hypot(d.x, d.y, d.z);
    if (dist >= radius) continue;
    const dir = dist > 1e-6 ? { x: d.x / dist, y: d.y / dist, z: d.z / dist } : { x: 0, y: 1, z: 0 };
    if (obstacleDistance(from, dir, dist) < dist) continue;
    hits.push([o.id, +(1 - dist / radius).toFixed(2)]);
  }
  return hits;
}

module.exports = { flashTargets };
