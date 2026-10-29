// Khối mây hình nấm của vụ nổ hạt nhân: quả cầu lửa phình ra rồi tắt dần, cột khói bốc lên, tán nấm nở ra trên đỉnh,
// sóng xung kích lan trên mặt đất và một vòm sóng nổ loang ra. Mọi thứ chạy theo tuổi của vụ nổ, hết `life` thì tự dọn.
import { scene } from '../core/scene.js';
import { NUKE } from '../config.js';

const { MeshBuilder, StandardMaterial, TransformNode, Color3 } = BABYLON;
const C = NUKE.cloud;

let cloud = null;

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut = (k) => 1 - (1 - k) * (1 - k);
const lerp = (a, b, k) => a + (b - a) * k;

function glow(name, color, alpha) {
  const mat = new StandardMaterial(name, scene);
  mat.emissiveColor = color;
  mat.disableLighting = true;
  mat.alpha = alpha;
  return mat;
}

// Khói: có đổ bóng nhẹ theo nắng, ánh lên màu lửa lúc mới nổ rồi xám dần.
function smoke(name) {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = new Color3(0.5, 0.46, 0.43);
  mat.specularColor = Color3.Black();
  return mat;
}

// Tán nấm là một đám cầu chụm lại thành khối dẹt, mỗi cụm có chỗ và cỡ ngẫu nhiên nên mép tán lồi lõm như súp lơ.
function buildCap(material) {
  const root = new TransformNode('nukeCap', scene);
  const puffs = [];
  for (let i = 0; i < C.puffs; i++) {
    const mesh = MeshBuilder.CreateSphere('nukePuff', { diameter: 1, segments: 8 }, scene);
    mesh.material = material;
    mesh.parent = root;
    puffs.push({
      mesh,
      angle: Math.random() * Math.PI * 2,
      spread: 0.25 + Math.random() * 0.75, // khoảng cách tới tâm (theo bán kính tán)
      lift: (Math.random() - 0.35) * 0.45, // độ cao so với tâm tán (theo bán kính tán)
      size: 0.35 + Math.random() * 0.4, // đường kính (theo bán kính tán)
      turn: (Math.random() - 0.3) * 0.25, // tốc độ cuộn quanh trục đứng (rad/giây)
    });
  }
  return { root, puffs };
}

// Dựng khối mây tại `[x, y, z]` (y là mặt đất).
export function spawnCloud([x, y, z]) {
  clearCloud();
  const fireMat = glow('nukeFire', new Color3(1, 0.85, 0.4), 0.95);
  const smokeMat = smoke('nukeSmoke');
  const shockMat = glow('nukeShock', new Color3(1, 0.9, 0.7), 0.6);
  const domeMat = glow('nukeDome', new Color3(1, 0.8, 0.5), 0.3);

  const fireball = MeshBuilder.CreateSphere('nukeFireball', { diameter: 2, segments: 16 }, scene);
  fireball.material = fireMat;
  const stem = MeshBuilder.CreateCylinder('nukeStem', { diameterTop: C.stemTop * 2, diameterBottom: C.stemBottom * 2, height: 1, tessellation: 20 }, scene);
  stem.material = smokeMat;
  const shock = MeshBuilder.CreateTorus('nukeShock', { diameter: 2, thickness: 0.05, tessellation: 48 }, scene);
  shock.material = shockMat;
  const dome = MeshBuilder.CreateSphere('nukeDome', { diameter: 2, segments: 24 }, scene);
  dome.material = domeMat;
  const cap = buildCap(smokeMat);

  cloud = { x, y, z, age: 0, fireball, stem, shock, dome, cap, materials: [fireMat, smokeMat, shockMat, domeMat] };
}

export function clearCloud() {
  if (!cloud) return;
  const { fireball, stem, shock, dome, cap, materials } = cloud;
  for (const mesh of [fireball, stem, shock, dome]) mesh.dispose();
  cap.puffs.forEach((puff) => puff.mesh.dispose());
  cap.root.dispose();
  materials.forEach((mat) => mat.dispose());
  cloud = null;
}

export const cloudActive = () => cloud !== null;

export function updateCloud(dt) {
  if (!cloud) return;
  cloud.age += dt;
  const { age, x, y, z, fireball, stem, shock, dome, cap, materials } = cloud;
  if (age > C.life) {
    clearCloud();
    return;
  }
  const [fireMat, smokeMat, shockMat, domeMat] = materials;
  const fade = 1 - clamp01((age - C.fadeFrom) / (C.life - C.fadeFrom));

  // Cột khói bốc lên và tán nấm nở ra trên đỉnh.
  const height = Math.max(0.01, C.stemHeight * easeOut(clamp01(age / C.rise)));
  stem.scaling.set(1, height, 1);
  stem.position.set(x, y + height / 2, z);
  const capRadius = C.capRadius * (0.15 + 0.85 * easeOut(clamp01(age / C.capGrow)));
  cap.root.position.set(x, y + height + capRadius * 0.15, z);
  for (const puff of cap.puffs) {
    puff.angle += puff.turn * dt;
    puff.mesh.position.set(Math.cos(puff.angle) * puff.spread * capRadius, puff.lift * capRadius, Math.sin(puff.angle) * puff.spread * capRadius);
    puff.mesh.scaling.setAll(puff.size * capRadius * 1.3);
  }
  const glowAmount = clamp01(1 - age / (C.fireballFade + 4)); // khói còn ánh lửa lúc mới nổ rồi xám dần
  smokeMat.emissiveColor.set(lerp(0.3, 0.85, glowAmount), lerp(0.28, 0.38, glowAmount), lerp(0.26, 0.08, glowAmount));
  smokeMat.alpha = 0.96 * fade;

  // Quả cầu lửa phình ra ở chân rồi tắt dần.
  const fireGrow = easeOut(clamp01(age / C.fireballGrow));
  const fireLife = clamp01(1 - age / C.fireballFade);
  fireball.scaling.setAll(Math.max(0.01, C.fireballRadius * fireGrow * (0.6 + 0.4 * fireLife)));
  fireball.position.set(x, y + C.fireballRadius * 0.55 + height * 0.25, z);
  fireMat.alpha = 0.95 * fireLife;
  fireMat.emissiveColor.set(1, lerp(0.3, 0.85, fireLife), lerp(0.05, 0.4, fireLife));
  fireball.setEnabled(fireLife > 0);

  // Sóng xung kích trên mặt đất và vòm sóng nổ.
  const shockK = clamp01(age / C.shockTime);
  const shockRadius = Math.max(0.01, C.shockRadius * easeOut(shockK));
  shock.scaling.set(shockRadius, 1, shockRadius);
  shock.position.set(x, y + 0.6, z);
  shockMat.alpha = 0.6 * (1 - shockK);
  shock.setEnabled(shockK < 1);
  const domeK = clamp01(age / C.domeTime);
  dome.scaling.setAll(Math.max(0.01, C.domeRadius * easeOut(domeK)));
  dome.position.set(x, y, z);
  domeMat.alpha = 0.3 * (1 - domeK);
  dome.setEnabled(domeK < 1);
}
