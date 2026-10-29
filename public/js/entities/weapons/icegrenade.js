import { part, box, ball, cylinder, colorMaterial as mat } from '../../core/meshes.js';
import { createHolder } from './weaponModel.js';

const { MeshBuilder } = BABYLON;

// Quả lựu đạn băng dựng bằng hình khối: thân tròn xanh băng có đai, nắp kim loại, chốt và cần gạt. Cũng là hình của quả đang bay (fx/grenades.js).
// Gốc ở giữa thân (chỗ nắm), nắp hướng +Y.
export const icegrenade = {
  icon: '🧊',
  firstPersonTilt: 0.3,
  swingSound: 'whoosh',
  iconSvg: {
    viewBox: '0 0 24 24',
    path: 'M12 5a7 7 0 1 0 0 14a7 7 0 0 0 0-14zM10 1h4v3h-4zM15 2h4l1 2h-5zM11 8h2v3h3v2h-3v3h-2v-3H8v-2h3z',
  },
  build() {
    const root = createHolder();
    part(ball(0.2), root, 0, 0, 0, mat('#8fd8ff')).scaling.y = 1.1; // thân
    part(cylinder(0.205, 0.205, 0.035), root, 0, 0, 0, mat('#2b5f8a')); // đai quanh thân
    part(cylinder(0.07, 0.1, 0.07), root, 0, 0.125, 0, mat('#9aa7b4')); // nắp
    part(box(0.025, 0.02, 0.15), root, 0, 0.17, -0.05, mat('#9aa7b4')); // cần gạt
    const pin = MeshBuilder.CreateTorus('pin', { diameter: 0.07, thickness: 0.012, tessellation: 12 }, root.getScene());
    part(pin, root, 0.05, 0.16, 0.02, mat('#d4af37')).rotation.x = Math.PI / 2; // chốt
    return root;
  },
};
