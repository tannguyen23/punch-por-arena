const config = require('../config'); // NUKE_* đọc lúc dùng: chỉnh được khi server đang chạy (test)
const { clamp } = require('../utils/math');
const { broadcast } = require('../net/messaging');
const { applyDamage } = require('./damage');
const { eyeOf, pointAt, aimDirection, obstacleDistance } = require('./raycast');
const { clearTableGames } = require('./tableGames');

// Radio gọi bom hạt nhân: một đợt oanh kích nhiều quả bom rải trên vùng đất của map (không chỉ một điểm như trước).
// Số quả, độ phủ mục tiêu và bán kính nổ ở NUKE_AREA (server/config.js). Server lấy mẫu các ô ĐẤT (bỏ sông / hư không,
// nên map đảo bay chỉ tính diện tích đảo + cầu), chia thành `bombs` cụm, rồi tăng bán kính tới khi vùng nổ phủ ≥ `coverage`
// diện tích đất. Mọi mốc thời gian gửi cho client là "còn bao lâu kể từ bây giờ" (mili giây), giống các tin nhắn đồng hồ khác.

// Điểm người gọi đang ngắm: dò từ mắt theo hướng ngắm tới tường / đất đầu tiên trong `maxRange`.
// Ngắm lên trời (hoặc xuống hư không của đảo trời) thì lấy điểm ở cuối tầm rồi hạ xuống mặt đất ngay dưới nó.
function aimPoint(room, p, yaw, pitch) {
  const { maxRange } = config.NUKE_AREA;
  const origin = eyeOf(p);
  const dir = aimDirection(yaw, pitch);
  const reach = Math.min(maxRange, obstacleDistance(room, origin, dir, maxRange));
  const end = pointAt(origin, dir, reach);
  const limit = room.mapData.size;
  const x = clamp(end.x, -limit, limit);
  const z = clamp(end.z, -limit, limit);
  const ground = room.terrain.groundAt(x, z, Infinity); // mặt cầu nếu có, -Infinity nếu là hư không của đảo trời
  const y = Number.isFinite(ground) ? ground : p.y; // nổ giữa trời ngang chân người gọi: vẫn có chỗ vẽ vùng đỏ và mây nấm
  return [x, y, z].map((v) => +v.toFixed(2));
}

// Các điểm mẫu trên đất để tính độ phủ. Bước ~4m với sân 160×160; đảo bay chỉ có mẫu trên đảo / cầu nên
// 70% là 70% diện tích đất thật, không phải 70% cả hình vuông.
function landSamples(room) {
  const size = room.mapData.size;
  const step = Math.max(2, Math.round(size / 20));
  const samples = [];
  for (let x = -size; x <= size; x += step) {
    for (let z = -size; z <= size; z += step) {
      if (room.terrain.isDry(x, z)) samples.push({ x, z });
    }
  }
  return samples;
}

function nearestSample(samples, x, z) {
  let best = samples[0];
  let bestD = Infinity;
  for (const s of samples) {
    const d = (s.x - x) ** 2 + (s.z - z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

// Chia mẫu đất thành `count` cụm (k-means). Khởi đầu từ mẫu gần điểm ngắm rồi lấy các mẫu xa nhất còn lại,
// nên không phụ thuộc Math.random và các quả bom trải đều khắp vùng đất.
function spreadCenters(samples, count, seed) {
  const centers = [{ ...seed }];
  while (centers.length < count && centers.length < samples.length) {
    let best = null;
    let bestD = -1;
    for (const s of samples) {
      let minD = Infinity;
      for (const c of centers) minD = Math.min(minD, (s.x - c.x) ** 2 + (s.z - c.z) ** 2);
      if (minD > bestD) {
        bestD = minD;
        best = s;
      }
    }
    centers.push({ ...best });
  }
  for (let iter = 0; iter < 8; iter++) {
    const sums = centers.map(() => ({ x: 0, z: 0, n: 0 }));
    for (const s of samples) {
      let bi = 0;
      let bd = Infinity;
      for (let i = 0; i < centers.length; i++) {
        const d = (s.x - centers[i].x) ** 2 + (s.z - centers[i].z) ** 2;
        if (d < bd) {
          bd = d;
          bi = i;
        }
      }
      sums[bi].x += s.x;
      sums[bi].z += s.z;
      sums[bi].n++;
    }
    centers.forEach((c, i) => {
      if (sums[i].n) {
        c.x = sums[i].x / sums[i].n;
        c.z = sums[i].z / sums[i].n;
      }
    });
  }
  return centers;
}

// Chọn `count` điểm trên đất: cụm k-means → làm tròn về mẫu đất gần nhất (không rơi xuống nước / hư không),
// rồi thay điểm gần chỗ ngắm nhất bằng đúng mẫu đất gần chỗ ngắm để đòn vẫn trúng hướng người gọi.
function pickBombs(samples, count, aim) {
  const seed = nearestSample(samples, aim[0], aim[2]);
  const centers = spreadCenters(samples, count, seed);
  const used = new Set();
  const key = (s) => `${s.x},${s.z}`;
  const points = [];
  for (const c of centers) {
    let best = null;
    let bestD = Infinity;
    for (const s of samples) {
      if (used.has(key(s))) continue;
      const d = (s.x - c.x) ** 2 + (s.z - c.z) ** 2;
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    if (!best) continue;
    used.add(key(best));
    points.push({ x: best.x, z: best.z });
  }
  while (points.length < count) { // vài cụm cùng làm tròn về một mẫu: lấp bằng mẫu xa nhất còn trống
    let best = null;
    let bestD = -1;
    for (const s of samples) {
      if (used.has(key(s))) continue;
      let minD = Infinity;
      for (const p of points) minD = Math.min(minD, (s.x - p.x) ** 2 + (s.z - p.z) ** 2);
      if (minD > bestD) {
        bestD = minD;
        best = s;
      }
    }
    if (!best) break;
    used.add(key(best));
    points.push({ x: best.x, z: best.z });
  }
  const target = nearestSample(samples, aim[0], aim[2]);
  if (!used.has(key(target)) && points.length) {
    let idx = 0;
    let bestD = Infinity;
    points.forEach((p, i) => {
      const d = (p.x - aim[0]) ** 2 + (p.z - aim[2]) ** 2;
      if (d < bestD) {
        bestD = d;
        idx = i;
      }
    });
    used.delete(key(points[idx]));
    points[idx] = { x: target.x, z: target.z };
    used.add(key(target));
  }
  return points;
}

// Tỉ lệ mẫu đất nằm trong ít nhất một vùng nổ bán kính `radius`.
function coverageAt(points, samples, radius) {
  if (!samples.length) return 0;
  const r2 = radius * radius;
  let covered = 0;
  for (const s of samples) {
    for (const p of points) {
      if ((s.x - p.x) ** 2 + (s.z - p.z) ** 2 <= r2) {
        covered++;
        break;
      }
    }
  }
  return covered / samples.length;
}

function groundY(room, x, z, fallback) {
  const ground = room.terrain.groundAt(x, z, Infinity);
  return Number.isFinite(ground) ? ground : fallback;
}

// Lập kế hoạch một đợt oanh kích: trả về các điểm rơi (trên đất) và một bán kính chung đủ phủ `coverage` diện tích đất.
function planBarrage(room, aim) {
  const { bombs, coverage, minRadius, maxRadius, killRatio } = config.NUKE_AREA;
  const samples = landSamples(room);
  const count = Math.min(bombs, samples.length);
  const picked = count > 0 ? pickBombs(samples, count, aim) : [];
  const bombPoints = picked.length ? picked : [{ x: aim[0], z: aim[2] }];
  let radius = minRadius;
  while (radius < maxRadius && coverageAt(bombPoints, samples, radius) < coverage) radius++;
  const killRadius = Math.max(1, Math.round(radius * killRatio));
  const points = bombPoints.map((p) => ({
    at: [p.x, groundY(room, p.x, p.z, aim[1]), p.z],
    radius,
    killRadius,
  }));
  return { points, radius, killRadius, coverage: coverageAt(bombPoints, samples, radius) };
}

// Bắt đầu một đợt bom nhắm theo hướng `yaw`, `pitch` của người gọi. Trả về false nếu phòng đang có đợt khác tới (không trừ đạn).
function startNuke(room, p, yaw, pitch) {
  if (room.nuke) return false;
  const { NUKE_PLANE_IN_MS, NUKE_PLANE_APPROACH, NUKE_PLANE_SPEED, NUKE_FALL_MS } = config;
  clearTableGames(room, 'nuke');
  const planeIn = NUKE_PLANE_IN_MS;
  const dropIn = planeIn + (NUKE_PLANE_APPROACH / NUKE_PLANE_SPEED) * 1000;
  const boomIn = dropIn + NUKE_FALL_MS;
  const id = room.nextNukeId++;
  const at = aimPoint(room, p, yaw, pitch); // máy bay bay qua điểm người gọi ngắm; các quả bom rơi theo `points`
  const plan = planBarrage(room, at);
  const view = {
    t: 'nuke',
    id,
    by: p.id,
    at,
    points: plan.points,
    radius: plan.radius,
    killRadius: plan.killRadius,
    heading: +(Math.random() * Math.PI * 2).toFixed(3), // hướng bay của máy bay (yaw, cùng quy ước với người chơi)
    altitude: config.NUKE_PLANE_ALTITUDE,
    speed: NUKE_PLANE_SPEED,
    approach: NUKE_PLANE_APPROACH,
    radioIn: 0,
    raidIn: config.NUKE_RADIO_MS,
    planeIn,
    dropIn,
    boomIn,
  };
  room.nuke = { id, ownerId: p.id, at, points: plan.points, view, startedAt: Date.now(), timer: setTimeout(() => detonate(room), boomIn) };
  broadcast(room, view);
  return true;
}

// Đợt bom đang tới (nếu có) cho người vừa vào phòng: cùng tin 'nuke' nhưng các mốc đã trừ đi thời gian trôi qua (âm = đã qua),
// để họ cũng nghe đúng phần còn lại của radio, còi báo động, bom rít và thấy máy bay / các quả bom đúng chỗ.
function nukeView(room) {
  if (!room.nuke) return null;
  const { view, startedAt } = room.nuke;
  const elapsed = Date.now() - startedAt;
  const shifted = Object.fromEntries(['radioIn', 'raidIn', 'planeIn', 'dropIn', 'boomIn'].map((key) => [key, view[key] - elapsed]));
  return { ...view, ...shifted };
}

// Sát thương của một quả bom theo khoảng cách NGANG tới tâm (không tính chênh cao): khớp vùng đỏ client vẽ là tường hình trụ đứng.
// Trong `killRadius`: hết máu; tới `radius`: giảm dần theo máu tối đa; ngoài: 0.
function bombDamage(o, point) {
  const d = Math.hypot(o.x - point.at[0], o.z - point.at[2]);
  if (d <= point.killRadius) return o.hp;
  if (d >= point.radius) return 0;
  return Math.max(1, Math.round(o.maxHp * (point.radius - d) / (point.radius - point.killRadius)));
}

// Bom nổ: cộng sát thương của mọi quả trong đợt cho từng người (một lần applyDamage để chỉ có một thông báo / một lượt hạ gục),
// kể cả người gọi. Người gọi tự dính thì không ai được tính hạ gục (damage.js). Trận vẫn tiếp tục.
function detonate(room) {
  const nuke = room.nuke;
  room.nuke = null;
  if (!nuke) return;
  const owner = room.players.get(nuke.ownerId) ?? null; // người gọi có thể đã thoát
  broadcast(room, { t: 'nukeboom', id: nuke.id, at: nuke.at, radius: nuke.view.radius, points: nuke.points }); // `radius`: client giảm độ trắng / rung theo khoảng cách
  for (const o of [...room.players.values()]) {
    if (o.dead) continue;
    let damage = 0;
    for (const point of nuke.points) damage += bombDamage(o, point);
    if (damage > 0) applyDamage(room, owner, o, Math.min(o.hp, damage), 'nuke');
  }
}

// Hết trận / trận mới: huỷ đợt bom đang tới, không cho nổ nữa (client dọn theo các tin nhắn đổi pha).
function clearNuke(room) {
  if (room.nuke) clearTimeout(room.nuke.timer);
  room.nuke = null;
}

module.exports = { startNuke, clearNuke, nukeView, planBarrage };
