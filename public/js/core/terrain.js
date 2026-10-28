// Địa hình do server gửi trong 'welcome': lưới độ cao (cm), mực nước và các cây cầu.
// `interpolate` phải khớp từng chữ với server/maps/terrain.js để chân đứng đúng mặt đất nhìn thấy.
let terrain = null;

export function setTerrain(data) {
  terrain = data;
}

export const getTerrain = () => terrain;
export const waterLevel = () => terrain?.waterLevel ?? -Infinity;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Mỗi ô vuông chia làm hai tam giác theo đường chéo nối (i+1, j) với (i, j+1), cũng là cách mặt đất được vẽ.
function interpolate({ heights, count, size, step }, x, z) {
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

// Độ cao mặt đất (không tính cầu). 0 nếu chưa có địa hình.
export const heightAt = (x, z) => (terrain ? interpolate(terrain, x, z) : 0);

export function bridgeAt(x, z) {
  return terrain?.bridges.find((b) => {
    const halfX = (b.axis === 'x' ? b.length : b.width) / 2;
    const halfZ = (b.axis === 'x' ? b.width : b.length) / 2;
    return Math.abs(x - b.x) <= halfX && Math.abs(z - b.z) <= halfZ;
  }) ?? null;
}

// Mặt đất mà người có độ cao chân `feetY` sẽ giẫm lên: mặt cầu nếu đã đủ cao để bước lên, ngược lại là đất.
export function groundAt(x, z, feetY) {
  const ground = heightAt(x, z);
  const bridge = bridgeAt(x, z);
  return bridge && feetY >= bridge.deckY - 0.5 ? Math.max(ground, bridge.deckY) : ground;
}

// Độ cao thấp nhất và cao nhất của đất trong hình chữ nhật tâm (x, z), kích thước w × d (để đặt tường trên đất dốc).
export function footprintHeights(x, z, w, d) {
  let min = Infinity;
  let max = -Infinity;
  const nx = Math.max(1, Math.ceil(w / 2));
  const nz = Math.max(1, Math.ceil(d / 2));
  for (let i = 0; i <= nx; i++) {
    for (let j = 0; j <= nz; j++) {
      const h = heightAt(x - w / 2 + (w * i) / nx, z - d / 2 + (d * j) / nz);
      min = Math.min(min, h);
      max = Math.max(max, h);
    }
  }
  return { min, max };
}
