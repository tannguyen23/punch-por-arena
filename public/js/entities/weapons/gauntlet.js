import { scene } from '../../core/scene.js';
import { part, box, ball, cylinder, colorMaterial as mat } from '../../core/meshes.js';
import { createHolder } from './weaponModel.js';

const { StandardMaterial, Color3 } = BABYLON;

// Sáu Viên đá Vô cực. Phát sáng nên dùng vật liệu riêng (emissive), dùng chung giữa mọi bản.
const STONES = ['#8a3ffc', '#2f7bff', '#ff2a2a', '#ff9a1f', '#2fd45a', '#ffe83a'];
const stoneMaterials = new Map();
function stoneMaterial(hex) {
  if (!stoneMaterials.has(hex)) {
    const stone = new StandardMaterial('stone', scene);
    stone.diffuseColor = Color3.FromHexString(hex);
    stone.emissiveColor = Color3.FromHexString(hex).scale(0.8);
    stoneMaterials.set(hex, stone);
  }
  return stoneMaterials.get(hex);
}

// Găng tay vô cực dựng tạm bằng hình khối. Có model .glb thì đổi sang `url` (xem sword.js) và xoá `build`.
export const gauntlet = {
  icon: '🧤',
  firstPersonTilt: 1.3,
  // Một nắm đấm bọc giáp vàng to bản, gốc ở giữa lòng bàn tay, các đốt ngón hướng +Y, mu bàn tay quay về -Z.
  build() {
    const root = createHolder();
    const gold = mat('#d9a521');
    const darkGold = mat('#8a5a10');
    part(cylinder(0.3, 0.22, 0.14), root, 0, -0.27, 0, gold); // cổ tay loe
    part(box(0.3, 0.34, 0.22), root, 0, -0.05, 0, gold); // bàn tay
    part(box(0.32, 0.05, 0.24), root, 0, -0.2, 0, darkGold); // viền cổ tay
    for (const x of [-0.105, -0.035, 0.035, 0.105]) {
      part(ball(0.095), root, x, 0.16, 0.02, gold); // khớp ngón
      part(box(0.07, 0.1, 0.12), root, x, 0.11, 0.07, darkGold); // ngón co lại
    }
    part(box(0.08, 0.16, 0.08), root, 0.19, 0.02, 0.04, gold).rotation.z = -0.35; // ngón cái
    // Sáu viên đá trên mu bàn tay và ngón cái
    const spots = [[0, 0.1], [-0.09, 0.0], [0.09, 0.0], [-0.06, -0.12], [0.06, -0.12]];
    spots.forEach(([x, y], i) => part(ball(0.075), root, x, y, -0.12, stoneMaterial(STONES[i])));
    part(ball(0.065), root, 0.22, 0.05, 0.04, stoneMaterial(STONES[5]));
    return root;
  },
};
