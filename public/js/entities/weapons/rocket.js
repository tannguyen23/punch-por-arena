import { part, box, cylinder, colorMaterial as mat } from '../../core/meshes.js';
import { createHolder } from './weaponModel.js';

// Súng phóng tên lửa dựng tạm bằng hình khối. Có model .glb thì đổi sang `url` (xem sword.js) và xoá `build`.
export const rocket = {
  icon: '🚀',
  firstPersonTilt: Math.PI / 2,
  shotSound: 'rocketLaunch',
  recoil: 0.08,
  viewHold: {
    position: [0.24, -0.17, 0.2],
    rotation: [Math.PI / 2 - 0.02, -0.04, 0],
    scale: 0.55,
    hands: [[0, 0, 0.03], [0, 0.42, -0.02]],
    muzzle: [0, 0.96, -0.12],
  },
  iconSvg: { viewBox: '0 0 32 16', path: 'M2 6h22v4H2zM24 5l6 3-6 3zM9 10h2l-1 4H8zM15 10h2l-1 3h-2z' },
  // Gốc ở tay cầm, ống phóng hướng +Y, nằm phía -Z so với tay cầm.
  build() {
    const root = createHolder();
    const olive = mat('#5b6b3a');
    part(cylinder(0.12, 0.12, 1.0), root, 0, 0.2, -0.12, olive); // ống phóng
    part(cylinder(0.15, 0.12, 0.12), root, 0, -0.32, -0.12, olive); // loe đuôi
    part(cylinder(0, 0.15, 0.26), root, 0, 0.83, -0.12, mat('#c0392b')); // đầu đạn
    part(box(0.035, 0.05, 0.11), root, 0, 0, 0, mat('#2b2b2b')).rotation.x = -0.2; // tay cầm
    part(box(0.03, 0.08, 0.06), root, 0.07, 0.25, -0.17, mat('#2b2b2b')); // kính ngắm
    return root;
  },
};
