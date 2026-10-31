// Đường bay chung của mọi thứ "ném đi": quả ném của khán giả solo, vũ khí ném bằng skill và cú nhảy đấm trời giáng. Một đường bay là
// { from, velocity, gravity } (mét, m/giây, m/giây²). Cùng công thức, bước mô phỏng và thứ tự va chạm với server/game/trajectory.js, raycast.js.
const pointAt = (a, v, t) => ({ x: a.x + v.x * t, y: a.y + v.y * t, z: a.z + v.z * t });

export function positionAt(flight, seconds) {
  const at = pointAt(flight.from, flight.velocity, seconds);
  at.y -= flight.gravity * seconds * seconds / 2;
  return at;
}

export const velocityAt = (flight, seconds) => ({ ...flight.velocity, y: flight.velocity.y - flight.gravity * seconds });

const vec = ([x, y, z]) => ({ x, y, z });

// Đường bay từ tin mạng ('skillthrow', 'bigpunch': from / velocity là mảng [x, y, z]).
export const flightOf = (m) => ({ from: vec(m.from), velocity: vec(m.velocity), gravity: m.gravity, duration: m.duration });

// Ném theo hướng ngắm (pitch dương là nhìn xuống): vận tốc đầu = hướng × speed, cộng thêm `lift` hất lên.
export function launch(from, yaw, pitch, rules) {
  const cos = Math.cos(pitch);
  return {
    from, gravity: rules.gravity,
    velocity: { x: Math.sin(yaw) * cos * rules.speed, y: -Math.sin(pitch) * rules.speed + rules.lift, z: Math.cos(yaw) * cos * rules.speed },
  };
}

// Cung bay từ `from` tới đúng `to` sau `flightMs`, nhô cao `apex` mét so với đường thẳng nối hai điểm (cú nhảy: điểm rơi chọn trước, vận tốc suy ra).
export function arcTo(from, to, flightMs, apex) {
  const seconds = flightMs / 1000;
  const gravity = 8 * apex / (seconds * seconds);
  return {
    from, gravity, duration: flightMs,
    velocity: { x: (to.x - from.x) / seconds, y: (to.y - from.y) / seconds + gravity * seconds / 2, z: (to.z - from.z) / seconds },
  };
}

// Các điểm cách đều thời gian dọc đường bay, dùng để vẽ đường xem trước khi biết trước thời gian bay.
export const sampleFlight = (flight, samples) =>
  Array.from({ length: samples }, (_, i) => positionAt(flight, flight.duration / 1000 * i / (samples - 1)));

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

// Bàn tay ném của skill ném vũ khí: lệch so với mắt theo hệ của hướng nhìn ngang. Phải khớp handOrigin ở server/game/trajectory.js.
export const handOrigin = (eye, yaw, hand) => ({
  x: eye.x + Math.cos(yaw) * hand.right + Math.sin(yaw) * hand.forward,
  y: eye.y + hand.up,
  z: eye.z - Math.sin(yaw) * hand.right + Math.cos(yaw) * hand.forward,
});

export function predictThrow(from, yaw, pitch, rules, world) {
  const flight = launch(from, yaw, pitch, rules);
  const points = [from];
  let previous = from;
  for (let ms = rules.stepMs; ms <= rules.maxFlightMs; ms += rules.stepMs) {
    const at = positionAt(flight, ms / 1000);
    const length = Math.hypot(at.x - previous.x, at.y - previous.y, at.z - previous.z);
    const dir = { x: (at.x - previous.x) / length, y: (at.y - previous.y) / length, z: (at.z - previous.z) / length };
    const obstacle = obstacleDistance(previous, at, length, dir, world, rules);
    const ground = world.groundAt(at.x, at.z, previous.y);
    if (obstacle <= length || at.y <= ground) {
      const ratio = obstacle <= length ? obstacle / length : Math.max(0, Math.min(1, (previous.y - ground) / (previous.y - at.y)));
      const hit = pointAt(previous, dir, length * ratio);
      points.push(hit);
      const landing = { x: hit.x, y: world.groundAt(hit.x, hit.z, previous.y), z: hit.z };
      const ring = world.ring; // không có võ đài (skill ném vũ khí): chỉ cần chỗ rơi có đất đỡ
      const valid = Number.isFinite(landing.y) && world.isSupported(hit.x, hit.z)
        && (!ring || (Math.abs(hit.x - ring.x) <= ring.half - rules.landingInset && Math.abs(hit.z - ring.z) <= ring.half - rules.landingInset));
      return { points, landing, valid };
    }
    points.push(at);
    previous = at;
  }
  return { points, landing: previous, valid: false };
}
