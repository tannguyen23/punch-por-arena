import { scene } from '../core/scene.js';

const { Mesh, VertexData, StandardMaterial, Color3 } = BABYLON;

const smoothstep = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const rgb = (hex) => Color3.FromHexString(hex).asArray();

// Nhiễu theo ô lưới để màu cỏ loang lổ chứ không đều tăm tắp.
const grain = (i, j) => {
  const h = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return h - Math.floor(h);
};

// Khoảng cách (mét) từ mỗi điểm lưới tới điểm nước gần nhất, lan dần từ các điểm dưới mực nước.
function distanceToWater({ count, step, heights, waterLevel }) {
  const dist = new Array(count * count).fill(Infinity);
  const queue = [];
  heights.forEach((h, n) => {
    if (h / 100 < waterLevel) {
      dist[n] = 0;
      queue.push(n);
    }
  });
  for (let head = 0; head < queue.length; head++) {
    const n = queue[head];
    const i = n % count;
    for (const next of [i > 0 ? n - 1 : -1, i < count - 1 ? n + 1 : -1, n - count, n + count]) {
      if (next >= 0 && next < dist.length && dist[next] > dist[n] + step) {
        dist[next] = dist[n] + step;
        queue.push(next);
      }
    }
  }
  return dist;
}

// Màu mỗi đỉnh: đáy sông nâu → cát quanh mép nước (rộng chừng 5m) → cỏ loang lổ → đá ở chỗ dốc, đỉnh đồi sáng hơn.
function vertexColor(palette, wet, shoreDistance, height, slope, noise) {
  if (wet) return rgb(palette.bed);
  const grass = mix(rgb(palette.grassDark), rgb(palette.grass), noise);
  let color = mix(rgb(palette.sand), grass, smoothstep(0, 5, shoreDistance));
  color = mix(color, mix(color, [0.78, 0.88, 0.6], 0.35), smoothstep(3, 6, height)); // đỉnh đồi
  return mix(color, rgb(palette.rock), smoothstep(0.15, 0.35, slope)); // chỗ dốc lộ đá
}

// Mặt đất dựng từ lưới độ cao của server. Hai tam giác mỗi ô theo đúng đường chéo mà core/terrain.js nội suy.
export function createGround(terrain, palette) {
  const { count, size, step, heights, waterLevel } = terrain;
  const positions = new Float32Array(count * count * 3);
  for (let j = 0; j < count; j++) {
    for (let i = 0; i < count; i++) {
      const v = (j * count + i) * 3;
      positions[v] = -size + i * step;
      positions[v + 1] = heights[j * count + i] / 100;
      positions[v + 2] = -size + j * step;
    }
  }

  const indices = [];
  for (let j = 0; j < count - 1; j++) {
    for (let i = 0; i < count - 1; i++) {
      const a = j * count + i;
      const b = a + 1;
      const c = a + count;
      const d = c + 1;
      indices.push(a, b, c, d, c, b); // tam giác (a,b,c) và (d,c,b), quay mặt lên trời (hệ trục tay trái của Babylon)
    }
  }

  const normals = new Float32Array(positions.length);
  VertexData.ComputeNormals(positions, indices, normals);

  const shore = distanceToWater(terrain);
  const colors = new Float32Array(count * count * 4);
  for (let j = 0; j < count; j++) {
    for (let i = 0; i < count; i++) {
      const n = j * count + i;
      const height = positions[n * 3 + 1];
      const color = vertexColor(palette, height < waterLevel, shore[n], height, 1 - normals[n * 3 + 1], grain(i, j));
      colors.set([...color, 1], n * 4);
    }
  }

  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  data.normals = normals;
  data.colors = colors;
  const mesh = new Mesh('terrain', scene);
  data.applyToMesh(mesh);

  const material = new StandardMaterial('terrain', scene);
  material.diffuseColor = Color3.White(); // màu đến từ màu đỉnh
  material.specularColor = Color3.Black();
  mesh.material = material;
  mesh.freezeWorldMatrix();
  return mesh;
}

