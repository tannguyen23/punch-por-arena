import { scene } from '../../core/scene.js';
import { part, box, ball, cylinder, colorMaterial as mat } from '../../core/meshes.js';
import { createHolder } from './weaponModel.js';

const { StandardMaterial, Color3 } = BABYLON;

const ARC_COUNT = 4;
const ARC_FLICKER_S = 0.05; // đổi vị trí tia điện mỗi chừng này giây

// Tia điện và vết sét phát sáng, dùng chung giữa mọi chiếc găng.
let electric = null;
function electricMaterial() {
  if (!electric) {
    electric = new StandardMaterial('electric', scene);
    electric.emissiveColor = new Color3(0.55, 0.9, 1);
    electric.disableLighting = true;
  }
  return electric;
}

// Mỗi chiếc găng có vài tia điện chập chờn quanh nắm đấm. Tự dừng khi găng bị huỷ.
function addCrackle(root) {
  const arcs = Array.from({ length: ARC_COUNT }, () => part(box(0.018, 0.22, 0.018), root, 0, 0, 0, electricMaterial()));
  let elapsed = 0;
  const observer = scene.onBeforeRenderObservable.add(() => {
    elapsed += scene.getEngine().getDeltaTime() / 1000;
    if (elapsed < ARC_FLICKER_S) return;
    elapsed = 0;
    for (const arc of arcs) {
      arc.setEnabled(Math.random() < 0.65);
      const a = Math.random() * Math.PI * 2;
      const b = (Math.random() - 0.5) * Math.PI;
      arc.position.set(Math.cos(a) * Math.cos(b) * 0.2, 0.02 + Math.sin(b) * 0.2, Math.sin(a) * Math.cos(b) * 0.2);
      arc.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    }
  });
  root.onDisposeObservable.add(() => scene.onBeforeRenderObservable.remove(observer));
}

// Găng sấm sét dựng tạm bằng hình khối. Có model .glb thì đổi sang `url` (xem sword.js) và xoá `build`.
// Vũ khí hai tay: mỗi tay một chiếc, `side` là +1 cho tay phải và -1 cho tay trái (đặt ngón cái cho đúng bên).
export const thunder = {
  icon: '⚡',
  dual: true,
  autoFire: true, // giữ chuột là tự đấm luân phiên trái/phải theo tốc độ của vũ khí
  swingSound: 'zap',
  firstPersonTilt: 1.2,
  // Nắm đấm xanh đậm bọc điện, gốc ở giữa nắm đấm, các đốt ngón hướng +Y, mu bàn tay quay về -Z.
  build(side = 1) {
    const root = createHolder();
    part(cylinder(0.24, 0.18, 0.14), root, 0, -0.22, 0, mat('#1d2745')); // cổ tay
    part(ball(0.3), root, 0, 0, 0, mat('#2f4fa8')).scaling.set(1, 1.1, 0.95); // nắm đấm
    part(ball(0.13), root, 0.15 * side, -0.02, 0.1, mat('#2f4fa8')); // ngón cái
    for (const x of [-0.1, -0.033, 0.033, 0.1]) part(box(0.06, 0.05, 0.1), root, x, 0.15, 0.03, mat('#e6edf7')); // đốt ngón bằng kim loại
    // Ba vạch sét vàng trên mu bàn tay
    [[0, 0.07, 0.5], [0.025, -0.01, -0.5], [-0.01, -0.09, 0.5]].forEach(([x, y, rz]) => {
      part(box(0.1, 0.022, 0.012), root, x, y, -0.15, electricMaterial()).rotation.z = rz;
    });
    addCrackle(root);
    return root;
  },
};
