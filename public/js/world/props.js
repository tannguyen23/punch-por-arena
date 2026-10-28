import { scene } from '../core/scene.js';
import { heightAt } from '../core/terrain.js';
import { part, box, ball, cylinder, colorMaterial as mat } from '../core/meshes.js';

const WOOD = '#8a5a33';
const WOOD_DARK = '#6b4423';

// Mỗi hàm dựng một loại vật phẩm trong node `root`, gốc tại mặt đất. Tên khớp server/maps/propTypes.js.
// `prop` là dữ liệu gốc từ map (có thể có `color`).
const builders = {
  tree(root) {
    part(cylinder(0.3, 0.4, 1.8), root, 0, 0.9, 0, mat('#6b4423'));
    part(cylinder(0, 2.4, 2.0), root, 0, 2.5, 0, mat('#2e7d32'));
    part(cylinder(0, 1.8, 1.7), root, 0, 3.5, 0, mat('#388e3c'));
  },

  bush(root) {
    part(ball(1.2), root, 0, 0.45, 0, mat('#3f8f3f')).scaling.y = 0.75;
    part(ball(0.8), root, 0.5, 0.3, 0.2, mat('#4c9f4c')).scaling.y = 0.75;
  },

  rock(root) {
    const rock = part(ball(1.4), root, 0, 0.4, 0, mat('#8d8d8d'));
    rock.scaling.set(1, 0.6, 0.85);
  },

  crate(root) {
    part(box(1, 1, 1), root, 0, 0.5, 0, mat(WOOD));
    for (const y of [0.04, 0.96]) part(box(1.04, 0.1, 1.04), root, 0, y, 0, mat(WOOD_DARK));
  },

  table(root) {
    part(box(1.6, 0.08, 0.9), root, 0, 0.75, 0, mat(WOOD));
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) part(box(0.08, 0.75, 0.08), root, sx * 0.72, 0.375, sz * 0.38, mat(WOOD_DARK));
    }
  },

  // Mặt ghế quay về +z, lưng tựa ở phía -z.
  chair(root) {
    part(box(0.45, 0.06, 0.45), root, 0, 0.45, 0, mat(WOOD));
    part(box(0.45, 0.5, 0.06), root, 0, 0.72, -0.2, mat(WOOD));
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) part(box(0.05, 0.45, 0.05), root, sx * 0.19, 0.225, sz * 0.19, mat(WOOD_DARK));
    }
  },

  // Cột góc võ đài, bọc đệm theo `color`.
  post(root, { color = '#cccccc' }) {
    part(cylinder(0.2, 0.2, 1.7), root, 0, 0.85, 0, mat('#9e9e9e'));
    for (const y of [0.45, 0.85, 1.25]) part(box(0.34, 0.2, 0.34), root, 0, y, 0, mat(color));
  },

  // Sàn võ đài: nền thấp, thảm xanh và vòng tròn ở giữa. Chỉ nhô lên vài cm nên đi lên thẳng được.
  ringMat(root) {
    part(box(13.2, 0.06, 13.2), root, 0, 0.03, 0, mat('#2b2b2b'));
    part(box(12.4, 0.04, 12.4), root, 0, 0.08, 0, mat('#2f5fa8'));
    part(cylinder(4, 4, 0.02), root, 0, 0.11, 0, mat('#e8e8e8'));
    part(cylinder(3.6, 3.6, 0.02), root, 0, 0.12, 0, mat('#2f5fa8'));
  },
};

export function createProp(prop) {
  const { type, x, z, rot = 0 } = prop;
  const root = new BABYLON.TransformNode(type, scene);
  root.position.set(x, heightAt(x, z), z);
  root.rotation.y = rot;
  builders[type]?.(root, prop);
  for (const mesh of root.getChildMeshes()) mesh.freezeWorldMatrix(); // vật thể tĩnh, khỏi tính lại mỗi khung hình
  return root;
}
