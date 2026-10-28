import { part, box, ball, cylinder, colorMaterial as mat } from '../../core/meshes.js';
import { createHolder } from './weaponModel.js';

// Rìu dựng tạm bằng hình khối. Có model .glb thì đổi sang `url` (xem sword.js) và xoá `build`.
export const axe = {
  icon: '🪓',
  firstPersonTilt: 0.8,
  // Gốc ở giữa chỗ cầm trên cán, đầu rìu hướng +Y, lưỡi rìu quay về +X.
  build() {
    const root = createHolder();
    part(cylinder(0.045, 0.045, 1.0), root, 0, 0.2, 0, mat('#8a5a33')); // cán
    part(ball(0.075), root, 0, -0.3, 0, mat('#4a3a2a')); // đuôi cán
    part(box(0.3, 0.3, 0.05), root, 0.17, 0.58, 0, mat('#8d98a3')); // bản rìu
    part(box(0.04, 0.36, 0.06), root, 0.33, 0.58, 0, mat('#dde3e8')); // lưỡi sắc
    part(box(0.12, 0.12, 0.05), root, -0.09, 0.6, 0, mat('#8d98a3')); // sống rìu
    return root;
  },
};
