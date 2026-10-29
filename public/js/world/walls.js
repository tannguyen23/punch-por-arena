import { scene } from '../core/scene.js';
import { footprintHeights } from '../core/terrain.js';
import { part, box, colorMaterial as mat } from '../core/meshes.js';

const WALL_HEIGHT = 3;
const BURY = 0.4; // chân tường chôn xuống đất để không hở khi đất dốc

// Mỗi hàm dựng một loại tường theo { x, z, w, d } (w theo trục x, d theo trục z). Tên khớp server/maps/wallKinds.js.
const builders = {
  // `span` là chênh lệch độ cao đất dưới chân tường: tường cao thêm chừng đó để đỉnh luôn vượt mặt đất.
  wall(root, { w, d }, span) {
    const height = WALL_HEIGHT + span + BURY;
    part(box(w, height, d), root, 0, height / 2 - BURY, 0, mat('#9a8f84'));
    part(box(w + 0.15, 0.2, d + 0.15), root, 0, WALL_HEIGHT + span + 0.1, 0, mat('#6e655c'));
  },

  // Dây võ đài: ba sợi dây mảnh chạy dọc theo cạnh dài; va chạm vẫn tính theo cả d.
  rope(root, { w, d }) {
    const alongX = w >= d;
    for (const y of [0.45, 0.85, 1.25]) {
      part(box(alongX ? w : 0.07, 0.07, alongX ? 0.07 : d), root, 0, y, 0, mat('#c62828'));
    }
  },
};

export function createWall(wall, parent) {
  const root = new BABYLON.TransformNode(wall.kind, scene);
  root.parent = parent;
  const { min, max } = footprintHeights(wall.x, wall.z, wall.w, wall.d);
  root.position.set(wall.x, min, wall.z);
  builders[wall.kind]?.(root, wall, max - min);
  for (const mesh of root.getChildMeshes()) mesh.freezeWorldMatrix();
  return root;
}
