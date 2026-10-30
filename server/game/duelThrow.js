const { DUEL_AUDIENCE } = require('../config');
const { eyeOf, aimDirection, pointAt, obstacleDistance, bodyDistance } = require('./raycast');

function positionAt(flight, seconds) {
  const at = pointAt(flight.from, flight.velocity, seconds);
  at.y -= flight.gravity * seconds * seconds / 2;
  return at;
}

function segment(a, b) {
  const length = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  return { length, dir: { x: (b.x - a.x) / length, y: (b.y - a.y) / length, z: (b.z - a.z) / length } };
}

function planThrow(room, p, yaw, pitch) {
  const rules = DUEL_AUDIENCE;
  const dir = aimDirection(yaw, pitch);
  const flight = {
    from: eyeOf(p), velocity: { x: dir.x * rules.speed, y: dir.y * rules.speed + rules.lift, z: dir.z * rules.speed },
    gravity: rules.gravity, duration: rules.maxFlightMs, landed: false,
  };
  let previous = flight.from;
  for (let ms = rules.stepMs; ms <= rules.maxFlightMs; ms += rules.stepMs) {
    const at = positionAt(flight, ms / 1000);
    const step = segment(previous, at);
    const obstacle = obstacleDistance(room, previous, step.dir, step.length);
    const ground = room.terrain.groundAt(at.x, at.z, previous.y);
    if (obstacle <= step.length || at.y <= ground) {
      const ratio = obstacle <= step.length ? obstacle / step.length
        : Math.max(0, Math.min(1, (previous.y - ground) / (previous.y - at.y)));
      const hit = pointAt(previous, step.dir, step.length * ratio);
      flight.duration = ms - rules.stepMs + rules.stepMs * ratio;
      flight.landing = { x: hit.x, y: room.terrain.groundAt(hit.x, hit.z, previous.y), z: hit.z };
      flight.landed = true;
      return flight;
    }
    previous = at;
  }
  flight.landing = positionAt(flight, flight.duration / 1000);
  return flight;
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
