import { part, box, cylinder, colorMaterial as mat } from '../../core/meshes.js';
import { createHolder } from './weaponModel.js';

// Radio quân đội gọi bom hạt nhân, dựng tạm bằng hình khối. Có model .glb thì đổi sang `url` (xem sword.js) và xoá `build`.
export const nuke = {
  icon: '📻',
  firstPersonTilt: 0.9,
  iconSvg: {
    viewBox: '0 0 24 24',
    path: 'M18 1h1.5v6H21a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14zM5 10v3h8v-3zM16 12a3 3 0 1 0 0 6a3 3 0 0 0 0-6zM5 15v1.5h8V15zM5 18v1.5h8V18z',
  },
  // Gốc ở chỗ cầm (đáy radio), ăng-ten hướng +Y.
  build() {
    const root = createHolder();
    const olive = mat('#4b5320');
    const black = mat('#1d1f1a');
    part(box(0.1, 0.22, 0.045), root, 0, 0.12, 0, olive); // thân
    part(cylinder(0.012, 0.016, 0.3), root, 0.035, 0.38, 0, black); // ăng-ten
    part(box(0.07, 0.04, 0.012), root, 0, 0.19, 0.027, mat('#6fdc6f')); // màn hình
    part(box(0.07, 0.07, 0.012), root, 0, 0.11, 0.027, black); // loa
    part(box(0.03, 0.025, 0.02), root, -0.025, 0.05, 0.03, mat('#c0392b')); // nút gọi
    part(cylinder(0.025, 0.025, 0.03), root, 0.03, 0.05, 0.03, black).rotation.x = Math.PI / 2; // núm xoay
    return root;
  },
};
