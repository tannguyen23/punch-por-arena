import { scene } from '../core/scene.js';

const { Mesh, VertexData, StandardMaterial, DynamicTexture, Color3 } = BABYLON;

const TILE = 14; // một ô hoạ tiết gợn sóng ứng với từng này mét
const FLOW_U = 0.018; // tốc độ trôi của hoạ tiết (ô mỗi giây)
const FLOW_V = 0.011;

// Ảnh gợn sóng: nền trắng với các vệt xanh nhạt ngắn, lặp liền mạch.
function createRippleTexture() {
  const size = 256;
  const tex = new DynamicTexture('ripple', size, scene);
  const ctx = tex.getContext();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.lineCap = 'round';
  for (let n = 0; n < 150; n++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 6 + Math.random() * 18;
    ctx.strokeStyle = `rgba(150, 205, 235, ${0.25 + Math.random() * 0.3})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    for (const dx of [-size, 0, size]) {
      for (const dy of [-size, 0, size]) {
        ctx.beginPath();
        ctx.moveTo(x + dx, y + dy);
        ctx.lineTo(x + dx + len, y + dy + len * 0.15);
        ctx.stroke();
      }
    }
  }
  tex.update();
  return tex;
}

// Mặt nước: một lưới phủ những ô có chỗ thấp hơn mực nước. Chỗ nông trong suốt và nhạt, chỗ sâu đậm và đặc,
// mép bờ mờ dần nhờ alpha theo từng đỉnh.
export function createWater(terrain) {
  const { count, size, step, heights, waterLevel } = terrain;
  const positions = new Float32Array(count * count * 3);
  const uvs = new Float32Array(count * count * 2);
  const colors = new Float32Array(count * count * 4);
  const wetNode = new Array(count * count);
  for (let j = 0; j < count; j++) {
    for (let i = 0; i < count; i++) {
      const n = j * count + i;
      const depth = waterLevel - heights[n] / 100;
      wetNode[n] = depth > 0;
      const x = -size + i * step;
      const z = -size + j * step;
      positions.set([x, waterLevel, z], n * 3);
      uvs.set([x / TILE, z / TILE], n * 2);
      const deep = Math.min(1, depth / 1.2);
      colors.set([0.42 - 0.3 * deep, 0.78 - 0.5 * deep, 0.86 - 0.3 * deep, Math.max(0, Math.min(0.82, 0.18 + depth * 0.8))], n * 4);
    }
  }

  // Chỉ dựng những ô có ít nhất một đỉnh dưới nước.
  const indices = [];
  for (let j = 0; j < count - 1; j++) {
    for (let i = 0; i < count - 1; i++) {
      const a = j * count + i;
      const b = a + 1;
      const c = a + count;
      const d = c + 1;
      if (wetNode[a] || wetNode[b] || wetNode[c] || wetNode[d]) indices.push(a, b, c, d, c, b);
    }
  }

  const normals = new Float32Array(positions.length);
  for (let n = 0; n < count * count; n++) normals[n * 3 + 1] = 1;

  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  data.normals = normals;
  data.uvs = uvs;
  data.colors = colors;
  const mesh = new Mesh('water', scene);
  data.applyToMesh(mesh);
  mesh.hasVertexAlpha = true;

  const ripple = createRippleTexture();
  const material = new StandardMaterial('water', scene);
  material.diffuseTexture = ripple;
  material.diffuseColor = Color3.White();
  material.emissiveColor = new Color3(0.04, 0.09, 0.14); // vẫn thấy rõ ở chỗ khuất sáng
  material.specularColor = new Color3(0.55, 0.65, 0.75);
  material.specularPower = 48;
  material.backFaceCulling = false;
  mesh.material = material;
  mesh.freezeWorldMatrix();

  return {
    mesh,
    // Hoạ tiết trôi chầm chậm theo dòng sông.
    update(dt) {
      ripple.uOffset += dt * FLOW_U;
      ripple.vOffset += dt * FLOW_V;
    },
  };
}
