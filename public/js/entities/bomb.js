import { scene } from '../core/scene.js';
import { part, box, cylinder, colorMaterial as mat } from '../core/meshes.js';
import { NUKE } from '../config.js';

const { TransformNode } = BABYLON;

// Quả bom hạt nhân dựng bằng hình khối: thân, mũi, đuôi và bốn cánh lái. Mũi hướng -Y (đang rơi thẳng xuống), gốc ở giữa thân.
export function createBomb() {
  const { length, radius } = NUKE.bomb;
  const root = new TransformNode('bomb', scene);
  const body = mat('#3d4a35');
  const dark = mat('#22271f');
  part(cylinder(radius * 2, radius * 2, length * 0.55), root, 0, 0, 0, body); // thân
  part(cylinder(radius * 2, 0.04, length * 0.28), root, 0, -length * 0.415, 0, body); // mũi tròn dần
  part(cylinder(radius * 1.2, radius * 2, length * 0.17), root, 0, length * 0.36, 0, dark); // đuôi thuôn
  part(cylinder(radius * 2.05, radius * 2.05, 0.12), root, 0, -length * 0.1, 0, mat('#d9c43a')); // vạch vàng báo hiệu
  for (const [w, d] of [[radius * 3.6, 0.05], [0.05, radius * 3.6]]) {
    part(box(w, length * 0.2, d), root, 0, length * 0.4, 0, dark); // cánh lái
  }
  return root;
}
