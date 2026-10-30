// Sinh lưới độ cao từ spec: có thể có sông/cầu hoặc địa hình cồn cát riêng.
// Lưới độ cao (đơn vị cm, số nguyên) là nguồn duy nhất: server dùng nó để kiểm tra, client nhận nguyên lưới này để
// dựng mặt đất và tính độ cao khi di chuyển. Hàm `interpolate` phải khớp từng chữ với public/js/world/terrain.js.
const { clamp } = require('../utils/math');
const { distToRect } = require('../utils/geometry');
const { ISLAND_FALL_MARGIN } = require('../config');

const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// Nhiễu giá trị 2D mượt, trong khoảng [-1, 1], tất định theo seed.
function hash(ix, iz, seed) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ Math.imul(seed, 1103515245);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function valueNoise(x, z, seed) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);
  const top = lerp(hash(ix, iz, seed), hash(ix + 1, iz, seed), u);
  const bottom = lerp(hash(ix, iz + 1, seed), hash(ix + 1, iz + 1, seed), u);
  return lerp(top, bottom, v) * 2 - 1;
}

// Độ cao tại (x, z) nội suy trên lưới. Mỗi ô vuông chia làm hai tam giác theo đường chéo nối (i+1, j) với (i, j+1),
// đúng cách tam giác của mặt đất được vẽ nên vị trí chân đứng khớp mặt đất nhìn thấy.
function interpolate(heights, count, size, step, x, z) {
  const gx = clamp((x + size) / step, 0, count - 1);
  const gz = clamp((z + size) / step, 0, count - 1);
  const i = Math.min(Math.floor(gx), count - 2);
  const j = Math.min(Math.floor(gz), count - 2);
  const fx = gx - i;
  const fz = gz - j;
  const h00 = heights[j * count + i] / 100;
  const h10 = heights[j * count + i + 1] / 100;
  const h01 = heights[(j + 1) * count + i] / 100;
  const h11 = heights[(j + 1) * count + i + 1] / 100;
  return fx + fz <= 1
    ? h00 + fx * (h10 - h00) + fz * (h01 - h00)
    : h11 + (1 - fx) * (h01 - h11) + (1 - fz) * (h10 - h11);
}

const deckRect = (b) => (b.axis === 'x'
  ? { x: b.x, z: b.z, w: b.length, d: b.width }
  : { x: b.x, z: b.z, w: b.width, d: b.length });
const padRect = (b) => {
  const r = deckRect(b);
  return { ...r, w: r.w + 6, d: r.d + 6 };
};

function buildTerrain(spec) {
  const { size, step, seed, waterLevel, plateau, hills, bumps, river } = spec;
  const count = Math.round((size * 2) / step) + 1;
  const islands = spec.islands ?? [];

  const riverRadius = river
    ? (theta) => river.radius + river.wobble.reduce((sum, [amp, k, phase]) => sum + amp * Math.sin(k * theta + phase), 0)
    : () => 0;
  const riverDistance = river
    ? (x, z) => Math.abs(Math.hypot(x, z) - riverRadius(Math.atan2(z, x)))
    : () => Infinity;

  const bridges = river ? (spec.bridges?.angles ?? []).map((deg) => {
    const theta = (deg * Math.PI) / 180;
    const r = riverRadius(theta);
    const axis = Math.abs(Math.cos(theta)) > 0.5 ? 'x' : 'z';
    const halfLength = river.halfWidth + river.bank + 1;
    return {
      axis,
      x: axis === 'x' ? +(Math.sign(Math.cos(theta)) * r).toFixed(2) : 0,
      z: axis === 'z' ? +(Math.sign(Math.sin(theta)) * r).toFixed(2) : 0,
      length: halfLength * 2,
      width: spec.bridges.width,
      deckY: spec.bridges.deckY,
      bedY: river.bedY,
    };
  }) : [];
  bridges.push(...(spec.floatingBridges ?? []).map((bridge) => ({ ...bridge, floating: true })));
  const islandAt = (x, z) => islands.find((island) =>
    Math.hypot(x - island.x, z - island.z) <= island.radius) ?? null;

  // Độ cao giải tích tại một điểm: đồi → mặt bằng cầu → lòng sông.
  function analyticHeight(x, z) {
    if (islands.length) {
      const nearest = islands.reduce((best, island) =>
        Math.hypot(x - island.x, z - island.z) < Math.hypot(x - best.x, z - best.z) ? island : best);
      return nearest.y + 0.45 * valueNoise(x / 8, z / 8, seed + 7)
        + 0.2 * valueNoise(x / 3, z / 3, seed + 8);
    }

    const r = Math.hypot(x, z);
    const noise = valueNoise(x / 38, z / 38, seed) + 0.5 * valueNoise(x / 17, z / 17, seed + 1);
    const amplitude = hills.inner * smoothstep(plateau.inner, plateau.outer, r)
      + hills.outer * (river ? smoothstep(river.radius - 6, river.radius + 14, r) : 1);
    // Nền được nâng lên (noise dao động quanh 0 nên cộng thêm) để đất không bao giờ trũng xuống dưới mực nước, trừ lòng sông.
    let h = amplitude * (0.55 * noise + 0.9);
    for (const b of bumps) h += b.h * Math.exp(-((x - b.x) ** 2 + (z - b.z) ** 2) / (2 * (b.r / 2) ** 2));

    if (spec.dunes) {
      const { angle, spacing, height, inner, outer, drift } = spec.dunes;
      const along = x * Math.cos(angle) + z * Math.sin(angle);
      const across = -x * Math.sin(angle) + z * Math.cos(angle);
      const phaseShift = drift * valueNoise(across / 24, along / 40, seed + 3);
      const ridge = (1 + Math.cos(((along + phaseShift) * Math.PI * 2) / spacing)) / 2;
      h += height * smoothstep(inner, outer, r) * (ridge - 0.35);
    }

    // Hai đầu cầu nằm trên đất bằng phẳng nên san mặt bằng quanh cầu về một độ cao (trước khi đào sông).
    for (const bridge of bridges) {
      h = lerp(h, spec.bridges.padY, 1 - smoothstep(0, 4, distToRect(x, z, padRect(bridge))));
    }

    if (!river) return h;

    // Đào lòng sông: giữa dòng là đáy, hai bên là bờ thoải dần lên đất.
    const bank = smoothstep(river.halfWidth, river.halfWidth + river.bank, riverDistance(x, z));
    const bed = river.bedY + 0.25 * valueNoise(x / 6, z / 6, seed + 2);
    return lerp(bed, h, bank);
  }

  const heights = new Array(count * count);
  let minHeight = Infinity;
  let maxHeight = -Infinity;
  for (let j = 0; j < count; j++) {
    for (let i = 0; i < count; i++) {
      const cm = Math.round(analyticHeight(-size + i * step, -size + j * step) * 100);
      heights[j * count + i] = cm;
      minHeight = Math.min(minHeight, cm / 100);
      maxHeight = Math.max(maxHeight, cm / 100);
    }
  }

  const bridgeAt = (x, z) => bridges.find((b) => distToRect(x, z, deckRect(b)) === 0) ?? null;
  const isSupported = (x, z) => !islands.length || islandAt(x, z) !== null || bridgeAt(x, z) !== null;
  const heightAt = (x, z) => {
    const bridge = bridgeAt(x, z);
    if (bridge?.floating) return bridge.deckY;
    if (islands.length && !islandAt(x, z)) return -100;
    return interpolate(heights, count, size, step, x, z);
  };
  const isLandAt = (x, z) => !islands.length || islandAt(x, z) !== null;

  return {
    // Phần gửi cho client trong 'welcome'.
    data: { size, step, count, waterLevel, heights, bridges, islands, floating: islands.length > 0 },
    waterLevel,
    bridges,
    islands,
    minHeight,
    maxHeight,
    heightAt,
    bridgeAt,
    isSupported,
    isLandAt,
    islandAt,
    riverDistance,
    riverRadius,
    padRect,
    deckRect,
    // Mặt đất mà người đứng ở độ cao chân `feetY` sẽ giẫm lên: mặt cầu nếu đã đủ cao để bước lên, ngược lại là đất.
    groundAt(x, z, feetY) {
      if (islands.length) {
        const bridge = bridgeAt(x, z);
        if (bridge && feetY >= bridge.deckY - 0.5) return bridge.deckY;
        if (!islandAt(x, z)) return -Infinity;
        const ground = heightAt(x, z);
        return feetY < ground - ISLAND_FALL_MARGIN ? -Infinity : ground; // đã rơi xuống dưới đảo: không được kéo ngược lên mặt đảo
      }
      const ground = heightAt(x, z);
      const bridge = bridgeAt(x, z);
      return bridge && feetY >= bridge.deckY - 0.5 ? Math.max(ground, bridge.deckY) : ground;
    },
    // Chỗ khô ráo, đủ xa mép nước để đặt người hoặc vật phẩm.
    isDry: (x, z) => isSupported(x, z) && heightAt(x, z) > waterLevel + 0.3,
  };
}

module.exports = { buildTerrain };
