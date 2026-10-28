// Hình chữ nhật trên mặt sân: { x, z, w, d } với (x, z) là tâm, w theo trục x, d theo trục z.

// Khoảng cách từ điểm tới hình chữ nhật (0 nếu nằm trong).
function distToRect(px, pz, { x, z, w, d }) {
  const dx = Math.max(Math.abs(px - x) - w / 2, 0);
  const dz = Math.max(Math.abs(pz - z) - d / 2, 0);
  return Math.hypot(dx, dz);
}

// Đoạn thẳng (x1,z1)→(x2,z2) có cắt hình chữ nhật không (phương pháp slab).
function segmentIntersectsRect(x1, z1, x2, z2, { x, z, w, d }) {
  let tmin = 0;
  let tmax = 1;
  const axes = [
    [x1, x2 - x1, x - w / 2, x + w / 2],
    [z1, z2 - z1, z - d / 2, z + d / 2],
  ];
  for (const [start, delta, lo, hi] of axes) {
    if (Math.abs(delta) < 1e-9) {
      if (start < lo || start > hi) return false;
      continue;
    }
    let t1 = (lo - start) / delta;
    let t2 = (hi - start) / delta;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

module.exports = { distToRect, segmentIntersectsRect };
