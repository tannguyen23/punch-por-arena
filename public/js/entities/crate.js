import { scene } from '../core/scene.js';
import { part, box, colorMaterial as mat } from '../core/meshes.js';

const { TransformNode, MeshBuilder, Vector3 } = BABYLON;

const CANOPY_Y = 5.2; // độ cao tán dù so với đáy hòm
const CANOPY_RADIUS = 2.3;

// Dây dù: thanh mảnh nối hai điểm (toạ độ trong hệ của `parent`).
function line(parent, from, to) {
  const length = Vector3.Distance(from, to);
  const mesh = part(box(0.03, 0.03, length), parent, 0, 0, 0, mat('#e8e2d0'));
  mesh.position = Vector3.Center(from, to);
  mesh.lookAt(to);
  return mesh;
}

// Tán dù: bán cầu hai mặt (nhìn từ dưới lên vẫn thấy). Mỗi hòm một cái, nửa phút mới có một hòm nên không cần dùng chung.
function createCanopy(parent) {
  const canopy = MeshBuilder.CreateSphere('canopy', {
    diameter: CANOPY_RADIUS * 2, slice: 0.5, segments: 10, sideOrientation: BABYLON.Mesh.DOUBLESIDE,
  }, scene);
  canopy.material = mat('#e67e22');
  canopy.parent = parent;
  canopy.position.y = CANOPY_Y;
  canopy.scaling.y = 0.55;
  return canopy;
}

// Hòm tiếp tế kiểu PUBG: hòm gỗ sơn xanh có đai vàng, gốc ở đáy hòm. `chute` là phần dù, bỏ đi khi hòm chạm đất.
export function createCrate() {
  const root = new TransformNode('crate', scene);
  part(box(1.1, 0.9, 1.1), root, 0, 0.45, 0, mat('#3f5a2c'));
  part(box(1.13, 0.93, 0.14), root, 0, 0.45, 0, mat('#c9a227'));
  part(box(0.14, 0.93, 1.13), root, 0, 0.45, 0, mat('#c9a227'));

  const chute = new TransformNode('chute', scene);
  chute.parent = root;
  createCanopy(chute);
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const rim = CANOPY_RADIUS * 0.7;
    line(chute, new Vector3(sx * 0.5, 0.9, sz * 0.5), new Vector3(sx * rim, CANOPY_Y, sz * rim));
  }
  return { root, chute };
}
