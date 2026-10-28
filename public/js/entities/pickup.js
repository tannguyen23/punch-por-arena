import { scene } from '../core/scene.js';
import { heightAt } from '../core/terrain.js';
import { createWeaponModel } from './weapons/index.js';

const { TransformNode, MeshBuilder, StandardMaterial, Color3 } = BABYLON;

const FLOAT_HEIGHT = 1.0;
const FALL_HEIGHT = 20; // độ cao vũ khí bắt đầu rơi
const FALL_TIME = 0.9; // giây

// Vòng sáng và cột sáng để nhìn thấy từ xa. Dùng chung cho mọi vũ khí nằm trên sân.
let glow = null;
function glowMaterials() {
  if (!glow) {
    const make = (alpha) => {
      const mat = new StandardMaterial('pickupGlow', scene);
      mat.emissiveColor = new Color3(1, 0.85, 0.3);
      mat.disableLighting = true;
      mat.backFaceCulling = false;
      mat.alpha = alpha;
      return mat;
    };
    glow = { ring: make(0.55), beam: make(0.14) };
  }
  return glow;
}

// Vũ khí nằm trên sân: xoay và nhấp nhô phía trên vòng sáng. Model nạp xong mới hiện, vòng sáng hiện ngay.
// `fall`: lao xuống từ trên cao (vòng sáng báo trước chỗ rơi), chạm đất thì gọi `onLand(pickup)`.
export function createPickup({ id, weapon, x, z }, { fall = false, onLand } = {}) {
  const { ring, beam } = glowMaterials();
  const root = new TransformNode('pickup' + id, scene);
  root.position.set(x, heightAt(x, z), z);

  const disc = MeshBuilder.CreateDisc('pickupRing', { radius: 0.9, tessellation: 32 }, scene);
  disc.parent = root;
  disc.rotation.x = Math.PI / 2;
  disc.position.y = 0.03;
  disc.material = ring;
  const column = MeshBuilder.CreateCylinder('pickupBeam', { diameter: 0.7, height: 4, tessellation: 16 }, scene);
  column.parent = root;
  column.position.y = 2;
  column.material = beam;

  const spin = new TransformNode('pickupSpin', scene);
  spin.parent = root;
  spin.position.y = FLOAT_HEIGHT + (fall ? FALL_HEIGHT : 0);

  const pickup = { id, weapon, root, spin, t: Math.random() * Math.PI * 2, disposed: false, falling: fall ? FALL_TIME : 0, onLand };
  createWeaponModel(weapon).then((model) => {
    if (!model) return;
    if (pickup.disposed) model.dispose();
    else model.parent = spin;
  });
  return pickup;
}

export function updatePickup(pickup, dt) {
  if (pickup.falling > 0) {
    pickup.falling = Math.max(0, pickup.falling - dt);
    const progress = 1 - pickup.falling / FALL_TIME;
    pickup.spin.position.y = FLOAT_HEIGHT + FALL_HEIGHT * (1 - progress * progress); // rơi nhanh dần
    pickup.spin.rotation.y += dt * 9;
    if (pickup.falling === 0) pickup.onLand?.(pickup);
    return;
  }
  pickup.t += dt;
  pickup.spin.rotation.y += dt * 1.5;
  pickup.spin.position.y = FLOAT_HEIGHT + 0.15 * Math.sin(pickup.t * 2);
}

// Material vòng sáng và model dùng chung nên không huỷ kèm.
export function disposePickup(pickup) {
  pickup.disposed = true;
  pickup.root.dispose();
}
