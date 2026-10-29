import { part, box, cylinder, colorMaterial as mat } from '../../core/meshes.js';
import { createHolder } from './weaponModel.js';

// Dao chiến đấu (hòm tiếp tế, có độ bền) dựng tạm bằng hình khối. Có model .glb thì đổi sang `url` (xem sword.js) và xoá `build`.
export const knife = {
  icon: '🔪',
  firstPersonTilt: 0.9,
  attack: 'slide', // chém bằng animation Right Slide khi tấn công
  iconSvg: { viewBox: '0 0 32 16', path: 'M1 7h10v3H1zM11 5h1.5v7H11zM12.5 6.5H26l5 2-5 1.5H12.5z' },
  // Gốc ở giữa cán, mũi dao hướng +Y.
  build() {
    const root = createHolder();
    part(box(0.045, 0.15, 0.04), root, 0, 0, 0, mat('#1f1f1f')); // cán
    part(box(0.05, 0.02, 0.045), root, 0, -0.08, 0, mat('#3a3a3a')); // đuôi cán
    part(box(0.11, 0.02, 0.05), root, 0, 0.085, 0, mat('#3a3a3a')); // chắn tay
    part(box(0.04, 0.24, 0.012), root, 0, 0.215, 0, mat('#aeb6bf')); // lưỡi
    part(cylinder(0, 0.04, 0.07), root, 0, 0.37, 0, mat('#aeb6bf')).scaling.z = 0.3; // mũi
    return root;
  },
};
