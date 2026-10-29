import { part, box, ball, cylinder, colorMaterial as mat } from '../../core/meshes.js';
import { createHolder } from './weaponModel.js';

// Dao găm dựng tạm bằng hình khối. Có model .glb thì đổi sang `url` (xem sword.js) và xoá `build`.
export const dagger = {
  icon: '🔪',
  firstPersonTilt: 0.9,
  attack: 'slide',
  // Gốc ở giữa cán, mũi dao hướng +Y.
  build() {
    const root = createHolder();
    part(box(0.05, 0.16, 0.05), root, 0, 0, 0, mat('#5a3a22')); // cán
    part(ball(0.07), root, 0, -0.1, 0, mat('#d4af37')); // đuôi
    part(box(0.16, 0.03, 0.06), root, 0, 0.09, 0, mat('#d4af37')); // chắn tay
    part(box(0.05, 0.3, 0.014), root, 0, 0.255, 0, mat('#c9d1d9')); // lưỡi
    part(cylinder(0, 0.05, 0.09), root, 0, 0.45, 0, mat('#c9d1d9')).scaling.z = 0.28; // mũi
    return root;
  },
};
