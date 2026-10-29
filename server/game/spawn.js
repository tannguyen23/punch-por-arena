const { MAX_HP, SPAWN_CLEARANCE, PLAYER_RADIUS } = require('../config');
const { send } = require('../net/messaging');
const { distToRect } = require('../utils/geometry');

const SPAWN_MARGIN = 3; // cách tường tối thiểu

// Vị trí khô ráo, không đè lên vật phẩm, tường nào và không sát người chơi còn sống trong phòng.
function isFree(room, pos) {
  if (!room.terrain.isDry(pos.x, pos.z)) return false;
  const onProp = room.mapData.props.some((p) => p.r > 0 && Math.hypot(p.x - pos.x, p.z - pos.z) < p.r + PLAYER_RADIUS);
  if (onProp) return false;
  if (room.mapData.walls.some((w) => distToRect(pos.x, pos.z, w) < PLAYER_RADIUS + 0.3)) return false;
  return ![...room.players.values()].some((o) => !o.dead && Math.hypot(o.x - pos.x, o.z - pos.z) < SPAWN_CLEARANCE);
}

// Vị trí ngẫu nhiên trong sân, tránh vật phẩm, tường và người chơi. Dùng cho chỗ hồi sinh và chỗ vũ khí rơi.
function randomFreePosition(room) {
  const range = room.mapData.size - SPAWN_MARGIN;
  let pos;
  const attempts = room.terrain.islands.length ? 200 : 20;
  for (let i = 0; i < attempts; i++) {
    pos = { x: (Math.random() * 2 - 1) * range, z: (Math.random() * 2 - 1) * range };
    if (isFree(room, pos)) break;
  }
  return pos;
}

function respawn(room, p) {
  Object.assign(p, randomFreePosition(room), { hp: MAX_HP, dead: false, fallStartedAt: 0 });
  send(p.ws, { t: 'setpos', x: p.x, z: p.z });
}

module.exports = { randomFreePosition, respawn };
