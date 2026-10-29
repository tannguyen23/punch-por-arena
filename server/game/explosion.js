const { SELF_SPLASH_MULT } = require('../config');
const { applyDamage } = require('./damage');
const { wallBetween, distanceToBody } = require('./raycast');

// Sức nổ tại `at` (tên lửa, lựu đạn): giảm dần theo khoảng cách tới thân người, không xuyên tường.
// Người gây nổ tự dính thì chỉ mất một phần; `owner` null (đã thoát) thì không ai được tính điểm.
function blast(room, owner, at, damage, radius) {
  for (const o of room.players.values()) {
    if (o.dead) continue;
    const dist = distanceToBody(o, at);
    if (dist >= radius || wallBetween(room, at, o)) continue;
    applyDamage(room, owner, o, damage * (1 - dist / radius) * (o === owner ? SELF_SPLASH_MULT : 1));
  }
}

module.exports = { blast };
