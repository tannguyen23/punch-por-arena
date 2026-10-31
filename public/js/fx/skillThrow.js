// Vũ khí đang bị ném (skill ném vũ khí): server tính sẵn quỹ đạo và báo 'skillthrow' (điểm đầu, vận tốc, trọng lực, thời gian bay);
// ở đây chỉ vẽ theo cùng công thức, quay tròn trên không, tới giờ thì bắn tia lửa và biến mất.
import { scene } from '../core/scene.js';
import { createWeaponModel } from '../entities/weapons/index.js';
import { positionAt, velocityAt, flightOf } from '../core/throwPath.js';
import { SKILL_THROW } from '../config.js';
import * as Fx from './effects.js';

const { TransformNode, Vector3 } = BABYLON;

const flying = new Set(); // { pivot, model, flight (core/throwPath.js), duration (giây), age }
let generation = 0; // tăng khi dọn sân để quả đang nạp model dở không hiện ra sau đó

export async function launchWeaponThrow(m) {
  const born = generation;
  const model = await createWeaponModel(m.w);
  if (!model) return;
  if (born !== generation) return model.dispose();
  const pivot = new TransformNode('thrownWeapon', scene);
  model.parent = pivot;
  flying.add({ pivot, model, flight: flightOf(m), duration: m.duration / 1000, age: 0 });
}

function remove(item) {
  item.pivot.dispose(); // model con đi theo; material vũ khí dùng chung nên không huỷ material
  flying.delete(item);
}

export function clearWeaponThrows() {
  generation++;
  for (const item of [...flying]) remove(item);
}

// Mỗi khung hình: đặt vũ khí theo quỹ đạo, mũi hướng theo vận tốc, lộn vòng quanh trục ngang.
export function updateWeaponThrows(dt) {
  for (const item of [...flying]) {
    item.age += dt;
    const t = Math.min(item.age, item.duration);
    const { x, y, z } = positionAt(item.flight, t);
    const heading = velocityAt(item.flight, t);
    const at = new Vector3(x, y, z);
    item.pivot.position.copyFrom(at);
    item.pivot.lookAt(at.add(new Vector3(heading.x, heading.y, heading.z)));
    item.model.rotation.x = Math.PI / 2 + SKILL_THROW.spin * item.age; // PI/2: mũi (+Y) hướng ra trước (+Z của pivot)
    if (item.age >= item.duration) {
      Fx.burst(at.x, at.y, at.z, 10);
      remove(item);
    }
  }
}
