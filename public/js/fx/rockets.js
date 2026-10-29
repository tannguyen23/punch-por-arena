// Tên lửa đang bay: server mô phỏng và báo 'rocket' (điểm đầu, hướng, tốc độ) rồi 'boom' khi nổ; ở đây chỉ vẽ theo cùng thông số.
import { scene } from '../core/scene.js';
import { part, box, cylinder, colorMaterial as mat } from '../core/meshes.js';
import { GUN_FX } from '../config.js';
import * as Fx from './effects.js';

const { TransformNode, Vector3 } = BABYLON;

const flying = new Map(); // id → { root, dir, speed, age }

function buildRocket() {
  const root = new TransformNode('rocket', scene);
  const body = new TransformNode('rocketBody', scene);
  body.parent = root;
  body.rotation.x = Math.PI / 2; // dựng dọc +Y rồi xoay cho mũi hướng +Z (hướng bay)
  part(cylinder(0.14, 0.14, 0.7), body, 0, 0, 0, mat('#5b6b3a'));
  part(cylinder(0, 0.14, 0.22), body, 0, 0.46, 0, mat('#c0392b'));
  for (const [w, d] of [[0.34, 0.02], [0.02, 0.34]]) part(box(w, 0.16, d), body, 0, -0.3, 0, mat('#3d4726'));
  return root;
}

export function launchRocket({ id, from, dir, speed }) {
  const root = buildRocket();
  const direction = new Vector3(...dir);
  root.position.set(...from);
  root.lookAt(root.position.add(direction));
  flying.set(id, { root, dir: direction, speed, age: 0, smoke: 0 });
}

// Nổ (hoặc bị huỷ khi sang trận mới): bỏ quả tên lửa đang vẽ.
export function removeRocket(id) {
  flying.get(id)?.root.dispose();
  flying.delete(id);
}

export function clearRockets() {
  for (const id of [...flying.keys()]) removeRocket(id);
}

// Bay thẳng theo hướng đã báo, nhả khói phía sau. Phòng khi mất tin nhắn 'boom' thì tự huỷ sau một lúc.
export function updateRockets(dt) {
  for (const [id, rocket] of flying) {
    rocket.age += dt;
    rocket.root.position.addInPlace(rocket.dir.scale(rocket.speed * dt));
    rocket.smoke -= dt;
    if (rocket.smoke <= 0) {
      rocket.smoke = GUN_FX.smokeEvery;
      const tail = rocket.root.position.subtract(rocket.dir.scale(0.5));
      Fx.burst(tail.x, tail.y, tail.z, 1, 0.15);
    }
    if (rocket.age > GUN_FX.rocketMaxAge) removeRocket(id);
  }
}
