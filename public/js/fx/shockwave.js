import { scene } from '../core/scene.js';
import { BIG_PUNCH } from '../config.js';
import * as Fx from './effects.js';

const { MeshBuilder, StandardMaterial, Color3 } = BABYLON;

function glowMaterial(color, alpha) {
  const mat = new StandardMaterial('shockwave', scene);
  mat.emissiveColor = new Color3(...color);
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  mat.alpha = alpha;
  return mat;
}

// Sóng xung kích của cú đấm trời giáng tại (x, y, z): vòng sáng loang ra tới `radius` (nhanh rồi chậm dần), đĩa bụi mờ phủ mặt đất và tia lửa văng ra.
export function shockwave(x, y, z, radius) {
  const { life, color, sparks } = BIG_PUNCH.shockwave;
  const spread = (k) => Math.max(radius * (1 - (1 - k) ** 2), 0.001); // loang nhanh lúc đầu rồi chậm dần

  const ringMat = glowMaterial(color, 0.85);
  const ring = MeshBuilder.CreateTorus('shockwaveRing', { diameter: 2, thickness: 0.2, tessellation: 48 }, scene);
  ring.material = ringMat;
  ring.position.set(x, y + 0.15, z);
  Fx.track({
    mesh: ring,
    ownMaterial: true,
    life,
    max: life,
    step(dt, k) {
      const s = spread(k);
      ring.scaling.set(s, 1, s);
      ringMat.alpha = 0.85 * (1 - k);
    },
  });

  const dustMat = glowMaterial(color, 0.35);
  const dust = MeshBuilder.CreateDisc('shockwaveDust', { radius: 1, tessellation: 48 }, scene);
  dust.rotation.x = Math.PI / 2;
  dust.material = dustMat;
  dust.position.set(x, y + 0.08, z);
  Fx.track({
    mesh: dust,
    ownMaterial: true,
    life: life * 0.8,
    max: life * 0.8,
    step(dt, k) {
      const s = spread(Math.min(1, k * 1.25));
      dust.scaling.set(s, s, s);
      dustMat.alpha = 0.35 * (1 - k) ** 2;
    },
  });

  Fx.burst(x, y + 0.2, z, sparks, 2.5);
  Fx.flash(x, y + 1, z, 3);
}
