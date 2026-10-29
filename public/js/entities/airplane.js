import { scene } from '../core/scene.js';
import { part, box, cylinder, colorMaterial as mat } from '../core/meshes.js';

const { TransformNode } = BABYLON;

const PROP_SPEED = 30; // vòng quay cánh quạt (rad/giây)

// Máy bay vận tải chở hòm tiếp tế, dựng bằng hình khối. Mũi hướng +Z (cùng quy ước với yaw), dài chừng 26m.
export function createAirplane() {
  const root = new TransformNode('plane', scene);
  const hull = mat('#6b7a5a');
  const dark = mat('#3f4836');
  const along = (mesh) => {
    mesh.rotation.x = Math.PI / 2; // hình trụ dựng dọc +Y, xoay cho nằm dọc +Z
    return mesh;
  };
  along(part(cylinder(2.4, 2.4, 16), root, 0, 0, 0, hull)); // thân
  along(part(cylinder(0.8, 2.4, 3), root, 0, -0.2, 9.5, hull)); // mũi thuôn
  along(part(cylinder(2.4, 0.6, 5), root, 0, 0.3, -10.5, hull)); // đuôi thuôn
  part(box(1.4, 0.5, 0.9), root, 0, 0.9, 8.6, mat('#22313f')); // kính buồng lái
  part(box(26, 0.35, 3.2), root, 0, 0.9, 1.5, hull); // cánh
  part(box(9, 0.25, 2), root, 0, 0.7, -12, hull); // cánh đuôi ngang
  part(box(0.3, 3.6, 2.6), root, 0, 2.4, -12, dark); // cánh đuôi đứng

  // Hai động cơ, mỗi cái một cánh quạt quay.
  const props = [-5.5, 5.5].map((x) => {
    along(part(cylinder(1.1, 1.1, 2.8), root, x, 0.6, 2.4, dark));
    const prop = new TransformNode('prop', scene);
    prop.parent = root;
    prop.position.set(x, 0.6, 3.9);
    part(box(0.3, 3.8, 0.1), prop, 0, 0, 0, mat('#1b1b1b'));
    part(box(3.8, 0.3, 0.1), prop, 0, 0, 0, mat('#1b1b1b'));
    return prop;
  });

  return {
    root,
    spin(dt) {
      for (const prop of props) prop.rotation.z += PROP_SPEED * dt;
    },
  };
}
