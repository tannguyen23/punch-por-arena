import { scene } from '../core/scene.js';
import { box, cylinder, colorMaterial as mat } from '../core/meshes.js';

const { Mesh, TransformNode } = BABYLON;

const PLANK_LIGHT = '#9c6b3f';
const PLANK_DARK = '#85562f';
const FRAME = '#5a3b20';

// Cầu gỗ: ván lát xen hai màu, hai thanh dầm dưới, lan can có trụ và các cột chống xuống đáy sông.
// Dữ liệu b = { axis, x, z, length, width, deckY, bedY } do server gửi. Dựng theo trục z rồi xoay nếu cầu nằm dọc trục x.
// Các mảnh cùng màu được gộp thành một mesh để cả cây cầu chỉ tốn vài lần vẽ.
export function createBridge(b) {
  const { length, width, deckY, bedY } = b;
  const groups = { [PLANK_LIGHT]: [], [PLANK_DARK]: [], [FRAME]: [] };
  const add = (color, mesh, x, y, z) => {
    mesh.position.set(x, y, z);
    mesh.material = mat(color);
    groups[color].push(mesh);
  };

  const planks = Math.round(length);
  for (let k = 0; k < planks; k++) {
    const z = -length / 2 + (k + 0.5) * (length / planks);
    add(k % 2 ? PLANK_DARK : PLANK_LIGHT, box(width, 0.14, length / planks - 0.06), 0, deckY - 0.07, z);
  }
  for (const side of [-1, 1]) {
    const x = side * (width / 2 - 0.1);
    add(FRAME, box(0.22, 0.22, length), side * (width / 2 - 0.4), deckY - 0.25, 0); // dầm
    add(FRAME, box(0.1, 0.1, length), x, deckY + 0.95, 0); // tay vịn
    add(FRAME, box(0.08, 0.08, length), x, deckY + 0.5, 0); // thanh giữa
    for (let z = -length / 2 + 0.5; z <= length / 2 - 0.4; z += 2) add(FRAME, box(0.14, 1.0, 0.14), x, deckY + 0.5, z); // trụ lan can
    // Cột chống xuống đáy sông (phần chôn dưới đất sẽ bị mặt đất che)
    const pillarHeight = deckY - 0.3 - bedY + 0.5;
    for (let z = -length / 2 + 2; z <= length / 2 - 1; z += 4) {
      add(FRAME, cylinder(0.4, 0.4, pillarHeight), side * (width / 2 - 0.4), bedY - 0.5 + pillarHeight / 2, z);
    }
  }

  const root = new TransformNode('bridge', scene);
  root.position.set(b.x, 0, b.z);
  root.rotation.y = b.axis === 'x' ? Math.PI / 2 : 0;
  for (const meshes of Object.values(groups)) {
    const merged = Mesh.MergeMeshes(meshes, true);
    merged.parent = root;
  }
  for (const mesh of root.getChildMeshes()) mesh.freezeWorldMatrix();
  return root;
}
