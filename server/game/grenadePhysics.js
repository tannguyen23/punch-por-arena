const { GRENADE, WALL_HEIGHT } = require('../config');
const { currentMap, punchBlockers, terrain } = require('../maps');
const { segmentRectEntry } = require('../utils/geometry');

// Đường bay của một quả lựu đạn: rơi theo trọng lực, nảy trên đất / mặt cầu, bật lại khi đập tường hoặc mép sân,
// lăn chậm dần rồi nằm yên, dưới nước thì bị cản và chìm từ từ. Người chơi không chặn lựu đạn.

// Đập vào tường chặn đòn (thấp hơn đỉnh tường): bật lại theo mặt tường bị đập và đứng yên tại chỗ nhịp này.
function hitWall(g, next) {
  for (const wall of punchBlockers) {
    if (segmentRectEntry(g.pos.x, g.pos.z, next.x, next.z, wall) === null) continue;
    if (next.y > terrain.heightAt(next.x, next.z) + WALL_HEIGHT) continue; // bay qua đầu tường
    // Trước đó đã nằm trong bề ngang x của tường thì đập vào mặt quay theo trục z, ngược lại là mặt quay theo trục x.
    if (Math.abs(g.pos.x - wall.x) <= wall.w / 2) g.vel.z *= -GRENADE.wallBounce;
    else g.vel.x *= -GRENADE.wallBounce;
    return true;
  }
  return false;
}

function keepInside(next, vel) {
  const limit = currentMap.size - GRENADE.radius;
  for (const axis of ['x', 'z']) {
    if (Math.abs(next[axis]) <= limit) continue;
    next[axis] = Math.sign(next[axis]) * limit;
    vel[axis] *= -GRENADE.wallBounce;
  }
}

// Chạm đất: nảy mạnh thì mất bớt vận tốc ngang (ma sát lúc va), nảy yếu thì nằm xuống và lăn chậm dần.
function hitGround(g, next, dt) {
  const ground = terrain.groundAt(next.x, next.z, g.pos.y) + GRENADE.radius; // đang ở trên cầu thì nảy trên mặt cầu
  if (next.y > ground) return;
  next.y = ground;
  if (g.vel.y < -GRENADE.restSpeed) {
    g.vel.y *= -GRENADE.bounce;
    g.vel.x *= GRENADE.friction;
    g.vel.z *= GRENADE.friction;
  } else {
    g.vel.y = 0;
    const roll = Math.exp(-GRENADE.rollDrag * dt);
    g.vel.x *= roll;
    g.vel.z *= roll;
  }
}

function moveGrenade(g, dt) {
  g.vel.y -= GRENADE.gravity * dt;
  if (g.pos.y < terrain.waterLevel) {
    const drag = Math.exp(-GRENADE.waterDrag * dt);
    g.vel.x *= drag;
    g.vel.y *= drag;
    g.vel.z *= drag;
  }
  const next = { x: g.pos.x + g.vel.x * dt, y: g.pos.y + g.vel.y * dt, z: g.pos.z + g.vel.z * dt };
  if (hitWall(g, next)) {
    next.x = g.pos.x;
    next.z = g.pos.z;
  }
  keepInside(next, g.vel);
  hitGround(g, next, dt);
  g.pos = next;
}

module.exports = { moveGrenade };
