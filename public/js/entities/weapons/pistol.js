import { part, box, cylinder, colorMaterial as mat } from '../../core/meshes.js';
import { createHolder } from './weaponModel.js';

// Súng lục dựng tạm bằng hình khối. Có model .glb thì đổi sang `url` (xem sword.js) và xoá `build`.
export const pistol = {
  icon: '🔫',
  firstPersonTilt: Math.PI / 2, // nòng chĩa thẳng ra trước
  shotSound: 'pistolShot',
  recoil: 0.035, // camera hếch lên mỗi phát (radian)
  // Góc nhìn thứ nhất (player/gunView.js): vị trí/xoay của báng súng trong hệ camera (x phải, y lên, z ra trước), độ co,
  // chỗ hai bàn tay và đầu nòng trong hệ của súng (cùng hệ với `build`).
  viewHold: {
    position: [0.15, -0.14, 0.42],
    rotation: [Math.PI / 2 - 0.03, -0.05, 0],
    scale: 0.85,
    hands: [[0, -0.01, 0.04], [-0.05, 0, 0.06]],
    muzzle: [0, 0.2, -0.075],
  },
  iconSvg: { viewBox: '0 0 24 16', path: 'M2 3h20v4H13l-1 2h-2l-1.5 6H4l1.6-8H2z' },
  // Gốc ở báng (chỗ cầm), nòng hướng +Y, thân súng nằm phía -Z so với báng (ở góc nhìn thứ nhất -Z là phía trên).
  build() {
    const root = createHolder();
    const metal = mat('#2b2d31');
    part(box(0.036, 0.06, 0.12), root, 0, -0.01, 0.01, mat('#3b3027')).rotation.x = -0.25; // báng
    part(box(0.04, 0.22, 0.05), root, 0, 0.06, -0.07, metal); // thân + khe trượt
    part(cylinder(0.02, 0.02, 0.04), root, 0, 0.18, -0.075, metal); // đầu nòng
    part(box(0.012, 0.05, 0.03), root, 0, 0.03, -0.025, metal); // vòng cò
    return root;
  },
};
