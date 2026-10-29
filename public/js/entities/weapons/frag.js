import { part, ball, box, cylinder, colorMaterial as mat } from '../../core/meshes.js';
import { createHolder } from './weaponModel.js';

// Lựu đạn nổ (hòm tiếp tế) dựng tạm bằng hình khối. Cũng là hình của quả lựu đạn đang bay (fx/grenades.js).
export const frag = {
  icon: '💣',
  firstPersonTilt: 0.3,
  swingSound: 'whoosh',
  iconSvg: { viewBox: '0 0 32 16', path: 'M10 9.5a6 6 0 1 0 12 0a6 6 0 1 0-12 0zM14 2h4v2.5h-4zM18 2.5l6 2.5v1.5l-6-2z' },
  // Gốc ở giữa thân (chỗ nắm), chóp ngòi hướng +Y.
  build() {
    const root = createHolder();
    part(ball(0.11), root, 0, 0, 0, mat('#4b5a2a')).scaling.y = 1.2; // thân
    part(cylinder(0.04, 0.045, 0.04), root, 0, 0.075, 0, mat('#8a8f93')); // chóp ngòi
    part(box(0.018, 0.1, 0.012), root, 0.03, 0.04, 0, mat('#8a8f93')).rotation.z = -0.35; // cần bẩy
    part(cylinder(0.03, 0.03, 0.006), root, -0.035, 0.09, 0, mat('#c9ced3')).rotation.z = Math.PI / 2; // khuyên chốt
    return root;
  },
};
