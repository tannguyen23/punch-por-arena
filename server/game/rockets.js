const { broadcast } = require('../net/messaging');
const { blast } = require('./explosion');
const { eyeOf, pointAt, obstacleDistance, firstBodyHit } = require('./raycast');

const BACK_OFF = 0.2; // nổ lùi lại một chút trước mặt tường/đất, để đoạn từ tâm nổ tới người đứng cùng phía không bị tính là xuyên tường

const pack = (p, digits = 2) => [p.x, p.y, p.z].map((v) => +v.toFixed(digits));

// Bắn một quả tên lửa từ mắt người bắn theo hướng `dir`. Server mô phỏng đường bay, client vẽ theo cùng thông số.
function launchRocket(room, p, weapon, dir) {
  const rocket = { id: room.nextRocketId++, ownerId: p.id, pos: eyeOf(p), dir, traveled: 0, weapon };
  room.rockets.push(rocket);
  broadcast(room, { t: 'rocket', id: rocket.id, by: p.id, w: p.weapon, from: pack(rocket.pos), dir: pack(dir, 4), speed: weapon.speed });
}

function explode(room, rocket, at) {
  const { damage, splash } = rocket.weapon;
  broadcast(room, { t: 'boom', id: rocket.id, at: pack(at), r: splash });
  blast(room, room.players.get(rocket.ownerId) ?? null, at, damage, splash); // người bắn có thể đã thoát
}

// Bay thêm một đoạn; chạm người (trừ người bắn), tường, đất hoặc hết tầm thì nổ. Trả về false khi đã nổ.
function stepRocket(room, rocket, dt) {
  const step = Math.min(rocket.weapon.speed * dt, rocket.weapon.range - rocket.traveled);
  const blocked = obstacleDistance(rocket.pos, rocket.dir, step);
  const hit = firstBodyHit(room, rocket.pos, rocket.dir, Math.min(step, blocked), room.players.get(rocket.ownerId));
  const dist = hit ? hit.dist : blocked;
  if (dist <= step) {
    explode(room, rocket, pointAt(rocket.pos, rocket.dir, Math.max(0, dist - BACK_OFF)));
    return false;
  }
  rocket.pos = pointAt(rocket.pos, rocket.dir, step);
  rocket.traveled += step;
  if (rocket.traveled < rocket.weapon.range) return true;
  explode(room, rocket, rocket.pos);
  return false;
}

// Tên lửa còn bay khi đổi pha (hết trận, trận mới) thì bỏ, không cho nổ trúng ai nữa.
function clearRockets(room) {
  room.rockets = [];
}

// Gọi mỗi nhịp của vòng lặp vật thể bay (projectiles.js).
function stepRockets(room, dt) {
  if (room.rockets.length > 0) room.rockets = room.rockets.filter((rocket) => stepRocket(room, rocket, dt));
}

module.exports = { launchRocket, clearRockets, stepRockets };
