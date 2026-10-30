// Cùng bước mô phỏng và thứ tự va chạm với server/game/duelThrow.js, raycast.js.
const pointAt = (a, v, t) => ({ x: a.x + v.x * t, y: a.y + v.y * t, z: a.z + v.z * t });

function rectEntry(a, b, wall) {
  let lo = 0;
  let hi = 1;
  for (const [start, delta, min, max] of [
    [a.x, b.x - a.x, wall.x - wall.w / 2, wall.x + wall.w / 2],
    [a.z, b.z - a.z, wall.z - wall.d / 2, wall.z + wall.d / 2],
  ]) {
    if (Math.abs(delta) < 1e-9) {
      if (start < min || start > max) return null;
    } else {
      lo = Math.max(lo, Math.min((min - start) / delta, (max - start) / delta));
      hi = Math.min(hi, Math.max((min - start) / delta, (max - start) / delta));
      if (lo > hi) return null;
    }
  }
  return lo;
}

function obstacleDistance(a, b, length, dir, world, rules) {
  let best = Infinity;
  for (const wall of world.walls) {
    const k = rectEntry(a, b, wall);
    if (k === null) continue;
    const at = pointAt(a, dir, k * length);
    if (at.y <= world.heightAt(at.x, at.z) + rules.wallHeight) best = Math.min(best, k * length);
  }
  for (let t = rules.terrainRayStep; t <= length + 1e-9; t += rules.terrainRayStep) {
    const at = pointAt(a, dir, t);
    if (at.y < world.heightAt(at.x, at.z)) return Math.min(best, t - rules.terrainRayStep / 2);
  }
  return best;
}

export function predictThrow(from, yaw, pitch, rules, world) {
  const cos = Math.cos(pitch);
  const velocity = { x: Math.sin(yaw) * cos * rules.speed, y: -Math.sin(pitch) * rules.speed + rules.lift, z: Math.cos(yaw) * cos * rules.speed };
  const points = [from];
  let previous = from;
  for (let ms = rules.stepMs; ms <= rules.maxFlightMs; ms += rules.stepMs) {
    const t = ms / 1000;
    const at = pointAt(from, velocity, t);
    at.y -= rules.gravity * t * t / 2;
    const length = Math.hypot(at.x - previous.x, at.y - previous.y, at.z - previous.z);
    const dir = { x: (at.x - previous.x) / length, y: (at.y - previous.y) / length, z: (at.z - previous.z) / length };
    const obstacle = obstacleDistance(previous, at, length, dir, world, rules);
    const ground = world.groundAt(at.x, at.z, previous.y);
    if (obstacle <= length || at.y <= ground) {
      const ratio = obstacle <= length ? obstacle / length : Math.max(0, Math.min(1, (previous.y - ground) / (previous.y - at.y)));
      const hit = pointAt(previous, dir, length * ratio);
      points.push(hit);
      const landing = { x: hit.x, y: world.groundAt(hit.x, hit.z, previous.y), z: hit.z };
      const ring = world.ring;
      const valid = Number.isFinite(landing.y) && world.isSupported(hit.x, hit.z)
        && Math.abs(hit.x - ring.x) <= ring.half - rules.landingInset && Math.abs(hit.z - ring.z) <= ring.half - rules.landingInset;
      return { points, landing, valid };
    }
    points.push(at);
    previous = at;
  }
  return { points, landing: previous, valid: false };
}
