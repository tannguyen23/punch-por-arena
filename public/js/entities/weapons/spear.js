import { part, ball, cylinder, colorMaterial as mat } from '../../core/meshes.js';
import { createHolder } from './weaponModel.js';

// Giáo dựng tạm bằng hình khối. Có model .glb thì đổi sang `url` (xem sword.js) và xoá `build`.
export const spear = {
  icon: '🔱',
  firstPersonTilt: 1.2,
  attack: 'slide',
  // Gốc ở chỗ cầm, mũi giáo hướng +Y (dài khoảng 1.8 m).
  build() {
    const root = createHolder();
    part(cylinder(0.04, 0.04, 1.8), root, 0, 0.4, 0, mat('#8a5a33')); // cán
    part(ball(0.07), root, 0, -0.5, 0, mat('#d4af37')); // đuôi
    part(ball(0.09), root, 0, 1.3, 0, mat('#d4af37')); // đai cổ giáo
    part(cylinder(0, 0.12, 0.34), root, 0, 1.5, 0, mat('#dde3e8')).scaling.z = 0.35; // mũi giáo
    return root;
  },
};
