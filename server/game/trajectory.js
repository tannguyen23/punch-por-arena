const { obstacleDistance, firstBodyHit, pointAt } = require('./raycast');

// Đường bay chung của mọi thứ "ném đi": quả ném của khán giả solo (duelThrow.js), vũ khí ném bằng skill (skillThrow.js) và cú nhảy đấm trời
// giáng (bigLeap.js). Một đường bay là { from, velocity, gravity }: vị trí tại t giây = from + velocity × t, trừ gravity × t² / 2 theo trục y.
// Client dùng đúng công thức này ở public/js/core/throwPath.js (đường xem trước, vật bay, người nhảy), hai bên phải khớp.

function positionAt(flight, seconds) {
  const at = pointAt(flight.from, flight.velocity, seconds);
  at.y -= flight.gravity * seconds * seconds / 2;
  return at;
}

function segment(a, b) {
  const length = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  return { length, dir: { x: (b.x - a.x) / length, y: (b.y - a.y) / length, z: (b.z - a.z) / length } };
}

// Bàn tay ném: lệch so với mắt theo hệ của hướng nhìn ngang (phải = (cos, −sin), trước = (sin, cos)).
const handOrigin = (eye, yaw, hand) => ({
  x: eye.x + Math.cos(yaw) * hand.right + Math.sin(yaw) * hand.forward,
  y: eye.y + hand.up,
  z: eye.z - Math.sin(yaw) * hand.right + Math.cos(yaw) * hand.forward,
});

// Ném theo hướng `dir`: vận tốc đầu = hướng × speed, cộng thêm `lift` (m/giây) hất lên.
const launch = (from, dir, rules) => ({
  from, gravity: rules.gravity,
  velocity: { x: dir.x * rules.speed, y: dir.y * rules.speed + rules.lift, z: dir.z * rules.speed },
});

// Cung bay từ `from` tới đúng `to` sau `flightMs`, nhô cao `apex` mét so với đường thẳng nối hai điểm (cú nhảy: điểm rơi chọn trước, vận tốc suy ra).
function arcTo(from, to, flightMs, apex) {
  const seconds = flightMs / 1000;
  const gravity = 8 * apex / (seconds * seconds);
  return {
    from, gravity, duration: flightMs,
    velocity: { x: (to.x - from.x) / seconds, y: (to.y - from.y) / seconds + gravity * seconds / 2, z: (to.z - from.z) / seconds },
  };
}

// Mô phỏng từng bước `rules.stepMs`: dừng ở tường / đất đầu tiên, hoặc ở người đầu tiên nếu có `shooter` (người ném, không tự trúng).
// Trả về { duration (ms bay), landing (chỗ dừng), landed (dừng vì tường / đất, không phải hết giờ hay trúng người), hit (người trúng hoặc null) }.
function fly(room, flight, rules, shooter = null) {
  let previous = flight.from;
  for (let ms = rules.stepMs; ms <= rules.maxFlightMs; ms += rules.stepMs) {
    const at = positionAt(flight, ms / 1000);
    const step = segment(previous, at);
    const obstacle = obstacleDistance(room, previous, step.dir, step.length);
    const body = shooter && firstBodyHit(room, previous, step.dir, Math.min(step.length, obstacle), shooter);
    if (body) {
      const stop = pointAt(previous, step.dir, body.dist);
      return { duration: ms - rules.stepMs + rules.stepMs * (body.dist / step.length), landing: stop, landed: false, hit: body.target };
    }
    const ground = room.terrain.groundAt(at.x, at.z, previous.y);
    if (obstacle <= step.length || at.y <= ground) {
      const ratio = obstacle <= step.length ? obstacle / step.length
        : Math.max(0, Math.min(1, (previous.y - ground) / (previous.y - at.y)));
      const stop = pointAt(previous, step.dir, step.length * ratio);
      return {
        duration: ms - rules.stepMs + rules.stepMs * ratio, landed: true, hit: null,
        landing: { x: stop.x, y: room.terrain.groundAt(stop.x, stop.z, previous.y), z: stop.z },
      };
    }
    previous = at;
  }
  return { duration: rules.maxFlightMs, landing: positionAt(flight, rules.maxFlightMs / 1000), landed: false, hit: null };
}

module.exports = { positionAt, segment, handOrigin, launch, arcTo, fly };
