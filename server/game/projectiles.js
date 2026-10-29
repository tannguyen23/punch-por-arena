const { PROJECTILE_TICK_MS } = require('../config');
const { allRooms } = require('./rooms');
const { stepRockets } = require('./rockets');
const { stepGrenades } = require('./grenades');

// Một vòng lặp riêng, nhanh hơn snapshot, mô phỏng mọi vật thể đang bay của mọi phòng (tên lửa, lựu đạn).
function startProjectileLoop() {
  let last = Date.now();
  return setInterval(() => {
    const now = Date.now();
    const dt = (now - last) / 1000;
    last = now;
    for (const room of allRooms()) {
      stepRockets(room, dt);
      stepGrenades(room, dt, now);
    }
  }, PROJECTILE_TICK_MS);
}

module.exports = { startProjectileLoop };
