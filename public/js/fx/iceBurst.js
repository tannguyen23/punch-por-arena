// Hiệu ứng băng: hạt băng nhả theo quả lựu đạn đang bay và vụ vỡ băng lúc nổ (mảnh băng văng ra, vòng sóng lạnh phình lên).
import { scene } from '../core/scene.js';
import { ICE } from '../config.js';
import * as Fx from './effects.js';

const { MeshBuilder, StandardMaterial, Color3 } = BABYLON;

function glowMaterial(name, color, alpha = 1) {
  const mat = new StandardMaterial(name, scene);
  mat.emissiveColor = color;
  mat.disableLighting = true;
  mat.alpha = alpha;
  return mat;
}

// Dùng chung cho mọi hạt / mảnh; mờ dần bằng cách thu nhỏ, không đổi alpha.
const shardMat = glowMaterial('iceShard', new Color3(0.75, 0.93, 1));

// Một hạt băng nhỏ rơi dần sau quả lựu đạn.
export function frostPuff(x, y, z) {
  const mesh = MeshBuilder.CreateSphere('frost', { diameter: 0.07 + Math.random() * 0.05, segments: 3 }, scene);
  mesh.material = shardMat;
  mesh.position.set(x + (Math.random() - 0.5) * 0.1, y, z + (Math.random() - 0.5) * 0.1);
  const max = 0.35;
  Fx.track({
    mesh,
    life: max,
    max,
    step(dt, k) {
      mesh.position.y -= 0.8 * dt;
      mesh.scaling.setAll(Math.max(1 - k, 0.001));
    },
  });
}

// Băng vỡ tại `[x, y, z]`, vũng băng bán kính `radius`: mảnh băng văng ra theo mọi hướng và một vòng sóng lạnh loang ra tới mép vũng.
export function iceBurst([x, y, z], radius) {
  const { life, shards, shardSpeed } = ICE.burst;
  for (let i = 0; i < shards; i++) {
    const mesh = MeshBuilder.CreatePolyhedron('shard', { type: 1, size: 0.05 + Math.random() * 0.06 }, scene);
    mesh.material = shardMat;
    mesh.position.set(x, y + 0.15, z);
    const angle = Math.random() * Math.PI * 2;
    const speed = shardSpeed * (0.4 + Math.random() * 0.6);
    const v = { x: Math.cos(angle) * speed, y: 2 + Math.random() * 3, z: Math.sin(angle) * speed };
    const max = life * (0.6 + Math.random() * 0.4);
    Fx.track({
      mesh,
      life: max,
      max,
      step(dt, k) {
        v.y -= 12 * dt;
        mesh.position.x += v.x * dt;
        mesh.position.y = Math.max(mesh.position.y + v.y * dt, y + 0.02);
        mesh.position.z += v.z * dt;
        mesh.rotation.x += 6 * dt;
        mesh.scaling.setAll(Math.max(1 - k * k, 0.001));
      },
    });
  }

  if (radius <= 0) return; // rơi xuống nước: chỉ có mảnh băng văng
  const mat = glowMaterial('iceWave', new Color3(0.6, 0.88, 1), 0.5);
  const ring = MeshBuilder.CreateTorus('iceWave', { diameter: 2, thickness: 0.12, tessellation: 40 }, scene);
  ring.material = mat;
  ring.position.set(x, y + 0.1, z);
  Fx.track({
    mesh: ring,
    ownMaterial: true,
    life,
    max: life,
    step(dt, k) {
      const s = Math.max(radius * Math.sqrt(k), 0.001);
      ring.scaling.set(s, 1, s);
      mat.alpha = 0.5 * (1 - k);
    },
  });
}
