import { scene } from '../core/scene.js';
import { state, poops } from '../state.js';
import { POOP } from '../config.js';
import * as Fx from './effects.js';

const { MeshBuilder, StandardMaterial, Color3 } = BABYLON;

// Khói thối bốc lên từ cục shit: những cục khói xanh xỉn nhỏ, to dần rồi tan. Dùng chung một material, mờ bằng cách thu nhỏ.
const puffMat = new StandardMaterial('stinkPuff', scene);
puffMat.emissiveColor = new Color3(...POOP.puff.color);
puffMat.disableLighting = true;
puffMat.alpha = 0.6;

function puff(x, y, z) {
  const mesh = MeshBuilder.CreateSphere('stinkPuff', { diameter: 0.3, segments: 4 }, scene);
  mesh.material = puffMat;
  mesh.position.set(x + (Math.random() - 0.5) * 0.3, y, z + (Math.random() - 0.5) * 0.3);
  const sway = Math.random() * Math.PI * 2;
  const { life, rise } = POOP.puff;
  Fx.track({
    mesh,
    life,
    max: life,
    step(dt, k) {
      mesh.position.y += rise * dt;
      mesh.position.x += Math.sin(sway + k * 6) * 0.25 * dt;
      mesh.scaling.setAll(Math.max(Math.sin(k * Math.PI) * 1.5, 0.001));
    },
  });
}

// Cục shit bị dậm bẹp: một đợt khói thối bốc ra.
export function stinkBurst({ x, y, z }) {
  for (let i = 0; i < POOP.puff.burst; i++) puff(x, y + 0.2 + Math.random() * 0.2, z);
}

// Gọi mỗi khung hình: mỗi cục shit gần mình nhả khói thối theo nhịp.
export function updatePoops(dt) {
  for (const poop of poops.values()) {
    poop.puffIn -= dt;
    if (poop.puffIn > 0) continue;
    poop.puffIn = POOP.puff.every * (0.7 + Math.random() * 0.6);
    const { x, y, z } = poop.root.position;
    if (Math.hypot(x - state.me.x, z - state.me.z) < POOP.puff.visibleRange) puff(x, y + 0.5, z);
  }
}
