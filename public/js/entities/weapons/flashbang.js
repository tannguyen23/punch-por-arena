import { part, box, cylinder, colorMaterial as mat } from '../../core/meshes.js';
import { createHolder } from './weaponModel.js';

// Lựu đạn choáng (hòm tiếp tế) dựng tạm bằng hình khối. Cũng là hình của quả lựu đạn đang bay (fx/grenades.js).
export const flashbang = {
  icon: '💥',
  firstPersonTilt: 0.3,
  swingSound: 'whoosh',
  iconSvg: { viewBox: '0 0 32 16', path: 'M12 5h8v10h-8zM14 1.5h4V5h-4zM18 2l5 2v1.5l-5-1.5z' },
  // Gốc ở giữa thân (chỗ nắm), chóp ngòi hướng +Y.
  build() {
    const root = createHolder();
    part(cylinder(0.065, 0.065, 0.13), root, 0, 0, 0, mat('#2f3338')); // thân
    part(cylinder(0.067, 0.067, 0.025), root, 0, 0.02, 0, mat('#e8e8e8')); // vạch trắng
    part(cylinder(0.035, 0.04, 0.035), root, 0, 0.082, 0, mat('#8a8f93')); // chóp ngòi
    part(box(0.016, 0.11, 0.012), root, 0.035, 0.03, 0, mat('#8a8f93')).rotation.z = -0.3; // cần bẩy
    part(cylinder(0.03, 0.03, 0.006), root, -0.03, 0.1, 0, mat('#c9ced3')).rotation.z = Math.PI / 2; // khuyên chốt
    return root;
  },
};
