const {
  EYE_HEIGHT, CROUCH_EYE_HEIGHT, BODY_RADIUS, BODY_HEIGHT, CROUCH_BODY_HEIGHT, WALL_HEIGHT, TERRAIN_RAY_STEP,
} = require('../config');
const { segmentRectEntry, segmentIntersectsRect } = require('../utils/geometry');

// Dò đường đạn / tên lửa trong 3D. Tia gồm `origin` {x, y, z} và hướng đơn vị `dir`; các hàm trả về khoảng cách
// dọc tia (mét) tới chỗ chạm, Infinity nếu không chạm trong `maxDist`.

const eyeOf = (p) => ({ x: p.x, y: p.y + (p.c ? CROUCH_EYE_HEIGHT : EYE_HEIGHT), z: p.z });
const pointAt = (origin, dir, t) => ({ x: origin.x + dir.x * t, y: origin.y + dir.y * t, z: origin.z + dir.z * t });

// Hướng nhìn giống camera của client: yaw quanh trục đứng, pitch dương là nhìn xuống.
function aimDirection(yaw, pitch) {
  const cos = Math.cos(pitch);
  return { x: Math.sin(yaw) * cos, y: -Math.sin(pitch), z: Math.cos(yaw) * cos };
}

// Thân người là hình trụ đứng từ chân lên tới đỉnh đầu (thấp hơn khi ngồi). Lấy đoạn t nằm trong hình trụ theo mặt sân
// giao với đoạn t nằm giữa chân và đỉnh đầu.
function bodyDistance(o, origin, dir, maxDist) {
  let tmin = 0;
  let tmax = maxDist;
  const ox = origin.x - o.x;
  const oz = origin.z - o.z;
  const a = dir.x * dir.x + dir.z * dir.z;
  const c = ox * ox + oz * oz - BODY_RADIUS * BODY_RADIUS;
  if (a < 1e-9) {
    if (c > 0) return Infinity; // bắn thẳng đứng, ở ngoài hình trụ
  } else {
    const b = ox * dir.x + oz * dir.z;
    const disc = b * b - a * c;
    if (disc < 0) return Infinity;
    const root = Math.sqrt(disc);
    tmin = Math.max(tmin, (-b - root) / a);
    tmax = Math.min(tmax, (-b + root) / a);
  }
  const top = o.y + (o.c ? CROUCH_BODY_HEIGHT : BODY_HEIGHT);
  if (Math.abs(dir.y) < 1e-9) {
    if (origin.y < o.y || origin.y > top) return Infinity;
  } else {
    const t1 = (o.y - origin.y) / dir.y;
    const t2 = (top - origin.y) / dir.y;
    tmin = Math.max(tmin, Math.min(t1, t2));
    tmax = Math.min(tmax, Math.max(t1, t2));
  }
  return tmin <= tmax ? tmin : Infinity;
}

// Tường chặn đòn (dây võ đài thì không). Tường cao WALL_HEIGHT tính từ mặt đất chỗ đạn chạm vào.
function wallDistance(room, origin, dir, maxDist) {
  const end = pointAt(origin, dir, maxDist);
  let best = Infinity;
  for (const wall of room.punchBlockers) {
    const k = segmentRectEntry(origin.x, origin.z, end.x, end.z, wall);
    if (k === null) continue;
    const hit = pointAt(origin, dir, k * maxDist);
    if (hit.y <= room.terrain.heightAt(hit.x, hit.z) + WALL_HEIGHT) best = Math.min(best, k * maxDist);
  }
  return best;
}

// Đồi và bờ sông: dò từng bước dọc tia xem đã chui xuống dưới mặt đất chưa (mặt cầu không chặn).
function terrainDistance(room, origin, dir, maxDist) {
  for (let t = TERRAIN_RAY_STEP; t <= maxDist + 1e-9; t += TERRAIN_RAY_STEP) {
    const p = pointAt(origin, dir, t);
    if (p.y < room.terrain.heightAt(p.x, p.z)) return t - TERRAIN_RAY_STEP / 2;
  }
  return Infinity;
}

const obstacleDistance = (room, origin, dir, maxDist) =>
  Math.min(wallDistance(room, origin, dir, maxDist), terrainDistance(room, origin, dir, maxDist));

// Người còn sống gần nhất mà tia chạm vào (bỏ qua `ignore`). { target, dist } hoặc null.
function firstBodyHit(room, origin, dir, maxDist, ignore = null) {
  let best = null;
  for (const o of room.players.values()) {
    if (o === ignore || o.dead) continue;
    const dist = bodyDistance(o, origin, dir, maxDist);
    if (dist < (best?.dist ?? Infinity)) best = { target: o, dist };
  }
  return best;
}

// Có bức tường nào nằm giữa hai điểm trên mặt sân không (đòn đấm, sức nổ không xuyên tường).
const wallBetween = (room, a, b) => room.punchBlockers.some((w) => segmentIntersectsRect(a.x, a.z, b.x, b.z, w));

// Khoảng cách từ một điểm tới bề mặt thân người (0 nếu nằm trong), để tính sức nổ: trúng thẳng người là đủ sát thương.
function distanceToBody(o, point) {
  const top = o.y + (o.c ? CROUCH_BODY_HEIGHT : BODY_HEIGHT);
  const side = Math.max(0, Math.hypot(point.x - o.x, point.z - o.z) - BODY_RADIUS);
  const vertical = Math.max(0, o.y - point.y, point.y - top);
  return Math.hypot(side, vertical);
}

module.exports = { eyeOf, pointAt, aimDirection, bodyDistance, obstacleDistance, firstBodyHit, wallBetween, distanceToBody };
