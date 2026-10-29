import { part, box, cylinder, colorMaterial as mat } from '../../core/meshes.js';
import { createHolder } from './weaponModel.js';

// AK-47 dựng tạm bằng hình khối. Có model .glb thì đổi sang `url` (xem sword.js) và xoá `build`.
export const ak47 = {
  icon: 'AK',
  firstPersonTilt: Math.PI / 2,
  autoFire: true, // giữ chuột là bắn liên tục theo cooldown
  shotSound: 'rifleShot',
  recoil: 0.018,
  viewHold: {
    position: [0.17, -0.2, 0.36],
    rotation: [Math.PI / 2 - 0.03, -0.05, 0],
    scale: 0.7,
    hands: [[0, 0, 0.03], [0, 0.36, -0.02]],
    muzzle: [0, 0.76, -0.095],
  },
  iconSvg: { viewBox: '0 0 32 16', path: 'M1 6h6v4l-5 2zM7 5h13v4H7zM20 6h6v2h-6zM26 6.5h5v1h-5zM13 9h3l1.5 5-3 .6zM9 9h2l-1 4H8z' },
  // Gốc ở tay cầm, nòng hướng +Y, thân súng nằm phía -Z so với tay cầm.
  build() {
    const root = createHolder();
    const metal = mat('#26282b');
    const wood = mat('#8a5427');
    part(box(0.036, 0.05, 0.1), root, 0, 0, 0.0, wood).rotation.x = -0.3; // tay cầm
    part(box(0.05, 0.36, 0.08), root, 0, 0.1, -0.08, metal); // thân súng
    part(box(0.046, 0.22, 0.07), root, 0, -0.24, -0.07, wood); // báng
    part(box(0.05, 0.2, 0.06), root, 0, 0.36, -0.085, wood); // ốp tay
    part(cylinder(0.024, 0.024, 0.32), root, 0, 0.6, -0.095, metal); // nòng
    part(cylinder(0.018, 0.018, 0.3), root, 0, 0.4, -0.125, metal); // ống trích khí
    part(box(0.012, 0.04, 0.03), root, 0, 0.74, -0.12, metal); // đầu ngắm
    const mag = part(box(0.04, 0.08, 0.2), root, 0, 0.17, 0.04, metal); // băng đạn cong về trước
    mag.rotation.x = 0.35;
    return root;
  },
};
