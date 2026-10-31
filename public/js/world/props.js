import { scene } from '../core/scene.js';
import { heightAt } from '../core/terrain.js';
import { part, box, ball, cylinder, colorMaterial as mat } from '../core/meshes.js';
import { createTableModel } from './tableModel.js';
import { MESH_DETAIL } from '../config.js';

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
    const [big, small] = MESH_DETAIL.bushSegments;
    const main = part(ball(1.2, scene, big), root, 0, 0.45, 0, mat('#3f8f3f'));
    const side = part(ball(0.8, scene, small), root, 0.5, 0.3, 0.2, mat('#4c9f4c'));
    for (const lump of [main, side]) {
      lump.convertToFlatShadedMesh(); // ít đoạn mà bóng mịn thì thấy múi lệch: để mỗi mặt một màu như đá cho ra khối low-poly
      lump.scaling.y = 0.75;
    }
  },

  rock(root) {
    const rock = part(ball(1.4, scene, MESH_DETAIL.rockSegments), root, 0, 0.4, 0, mat('#8d8d8d'));
    rock.convertToFlatShadedMesh(); // mỗi mặt một màu: đá kiểu low-poly
    rock.scaling.set(1, 0.6, 0.85);
  },

  cactus(root) {
    const green = mat('#477143');
    const trunk = part(cylinder(0.27, 0.38, 3.1), root, 0, 1.55, 0, green);
    trunk.rotation.z = 0.04;
    for (const side of [-1, 1]) {
      const armX = side * 0.55;
      part(cylinder(0.18, 0.2, 0.75), root, side * 0.28, 1.55, 0, green).rotation.z = Math.PI / 2;
      part(cylinder(0.2, 0.24, 1.0), root, armX, 2.05, 0, green);
    }
  },

  crate(root) {
    part(box(1, 1, 1), root, 0, 0.5, 0, mat(WOOD));
    for (const y of [0.04, 0.96]) part(box(1.04, 0.1, 1.04), root, 0, y, 0, mat(WOOD_DARK));
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
  ringMat(root, { color = '#2f5fa8' }) {
    part(box(13.2, 0.06, 13.2), root, 0, 0.03, 0, mat('#2b2b2b'));
    part(box(12.4, 0.04, 12.4), root, 0, 0.08, 0, mat(color));
    part(cylinder(4, 4, 0.02), root, 0, 0.11, 0, mat('#e8e8e8'));
    part(cylinder(3.6, 3.6, 0.02), root, 0, 0.12, 0, mat(color));
  },
};

// Loại vật phẩm có hàng trăm bản giống nhau (cây, bụi, đá...) dùng thin instance: mỗi khối của mỗi (loại, màu) là MỘT mesh duy nhất, mọi bản trên sân
// chỉ là một ma trận trong buffer của mesh đó. Cả nhóm vẽ bằng một draw call và Babylon không phải chọn / cắt từng bản theo khung nhìn mỗi khung hình
// (190 cây = 3 draw call, 0 mesh riêng; với instance thường thì từng bản vẫn tốn CPU ở bước chọn mesh). Bàn (model .glb) và sàn võ đài (chỉ một) dựng riêng.
const INSTANCED = new Set(['tree', 'bush', 'rock', 'cactus', 'crate', 'chair', 'post']);
const templates = new Map(); // `loại:màu` → [{ mesh, local }]: khối đã đưa về gốc toạ độ và ma trận đặt khối đó trong vật phẩm

// Dọn mẫu của map cũ (gọi đầu buildArena): buffer ma trận thuộc về mesh mẫu chứ không thuộc node `arena` nên không tự bị dọn theo.
export function resetProps() {
  for (const parts of templates.values()) for (const { mesh } of parts) mesh.dispose();
  templates.clear();
}

function templateFor(prop) {
  const key = `${prop.type}:${prop.color ?? ''}`;
  if (!templates.has(key)) {
    const node = new BABYLON.TransformNode(`${prop.type}Template`, scene);
    builders[prop.type](node, prop);
    const parts = node.getChildMeshes().map((mesh) => {
      const local = mesh.computeWorldMatrix(true).clone(); // node đứng ở gốc nên đây chính là chỗ đặt của khối trong vật phẩm
      mesh.parent = null;
      mesh.position.setAll(0);
      mesh.rotation.setAll(0);
      mesh.scaling.setAll(1); // vị trí / góc / cỡ nằm trong ma trận của từng bản, mesh mẫu để nguyên ở gốc
      mesh.isPickable = false;
      return { mesh, local };
    });
    node.dispose();
    templates.set(key, parts);
  }
  return templates.get(key);
}

function addInstances(prop) {
  const { x, z, rot = 0 } = prop;
  const root = BABYLON.Matrix.RotationY(rot);
  root.setTranslation(new BABYLON.Vector3(x, heightAt(x, z), z));
  for (const { mesh, local } of templateFor(prop)) mesh.thinInstanceAdd(local.multiply(root), false);
}

// Gọi sau khi đã thêm mọi vật phẩm của map: đẩy buffer lên GPU, tính khung bao ôm hết các bản rồi đóng băng.
export function finishProps() {
  for (const parts of templates.values()) {
    for (const { mesh } of parts) {
      mesh.thinInstanceBufferUpdated('matrix');
      mesh.thinInstanceRefreshBoundingInfo(true);
      mesh.freezeWorldMatrix();
    }
  }
}

export function createProp(prop, parent, id) {
  const { type, x, z, rot = 0 } = prop;
  if (INSTANCED.has(type)) {
    addInstances(prop);
    return null;
  }
  const root = new BABYLON.TransformNode(type, scene);
  root.parent = parent;
  root.position.set(x, heightAt(x, z), z);
  root.rotation.y = rot;
  if (type === 'table') {
    createTableModel(root, id);
    return root;
  }
  builders[type]?.(root, prop);
  for (const mesh of root.getChildMeshes()) mesh.freezeWorldMatrix(); // vật thể tĩnh, khỏi tính lại mỗi khung hình
  return root;
}
