const { DUEL_AUDIENCE } = require('../config');
const { eyeOf, aimDirection, pointAt, bodyDistance } = require('./raycast');
const { positionAt, segment, launch, fly } = require('./trajectory');

// Quỹ đạo quả ném của khán giả: bay từ mắt, dừng ở tường / đất đầu tiên (trúng người thì xét riêng ở tomatoTarget).
function planThrow(room, p, yaw, pitch) {
  const flight = launch(eyeOf(p), aimDirection(yaw, pitch), DUEL_AUDIENCE);
  return Object.assign(flight, fly(room, flight, DUEL_AUDIENCE));
}

function inRing(room, at) {
  const { x, z, half } = room.mapData.ring;
  return Number.isFinite(at.y) && Math.abs(at.x - x) <= half - DUEL_AUDIENCE.landingInset
    && Math.abs(at.z - z) <= half - DUEL_AUDIENCE.landingInset && room.terrain.isSupported(at.x, at.z);
}

function tomatoTarget(room, ev, flight, elapsed) {
  let previous = positionAt(flight, flight.checked / 1000);
  const end = Math.min(elapsed, flight.duration);
  for (let ms = flight.checked; ms < end;) {
    const next = Math.min(end, ms + DUEL_AUDIENCE.stepMs);
    const at = positionAt(flight, next / 1000);
    const step = segment(previous, at);
    let best = null;
    for (const id of ev.fighters) {
      const p = room.players.get(id);
      if (!p || p.dead) continue;
      const distance = bodyDistance(p, previous, step.dir, step.length);
      if (distance < (best?.distance ?? Infinity)) best = { id, distance };
    }
    if (best) return { id: best.id, at: pointAt(previous, step.dir, best.distance) };
    previous = at;
    ms = next;
  }
  flight.checked = end;
  return null;
}

module.exports = { planThrow, inRing, tomatoTarget };
