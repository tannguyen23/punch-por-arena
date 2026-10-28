import { scene, solidMaterial } from '../../core/scene.js';

const { TransformNode, Color3 } = BABYLON;

// Một material cho mỗi màu, tắt backface culling cho khỏi lộ mặt trong dù chiều mặt sau khi đổi hệ trục ra sao.
const materials = new Map();
function partMaterial(hex) {
  if (!materials.has(hex)) {
    const mat = solidMaterial(Color3.FromHexString(hex));
    mat.backFaceCulling = false;
    materials.set(hex, mat);
  }
  return materials.get(hex);
}

// Node gốc cho vũ khí dựng bằng code: gốc toạ độ ở chỗ cầm, đầu vũ khí hướng +Y.
export function createHolder() {
  return new TransformNode('weapon', scene);
}

// Nạp model của một vũ khí, tô màu, đo chiều dài thật và điểm cầm để lần nào dựng cũng cùng kích thước.
export async function loadTemplate(def) {
  const container = await BABYLON.SceneLoader.LoadAssetContainerAsync('', def.url, scene, null, '.glb');
  let minY = Infinity;
  let maxY = -Infinity;
  let gripY = null;
  for (const mesh of container.meshes) {
    if (!mesh.getTotalVertices()) continue;
    mesh.computeWorldMatrix(true);
    const box = mesh.getBoundingInfo().boundingBox;
    minY = Math.min(minY, box.minimumWorld.y);
    maxY = Math.max(maxY, box.maximumWorld.y);
    const kind = def.kindOf(mesh, box.maximumWorld.y);
    mesh.material = partMaterial(def.colors[kind]);
    if (kind === def.gripKind) gripY = (box.minimumWorld.y + box.maximumWorld.y) / 2;
  }
  return { container, scale: def.length / (maxY - minY), gripY: gripY ?? (minY + maxY) / 2 };
}

// Node vũ khí có gốc tại điểm cầm, lưỡi/đầu vũ khí hướng +Y.
export function instantiate({ container, scale, gripY }) {
  const holder = new TransformNode('weapon', scene);
  holder.scaling.setAll(scale);
  const body = new TransformNode('weaponBody', scene);
  body.parent = holder;
  body.position.y = -gripY;
  container.instantiateModelsToScene((name) => name, false).rootNodes.forEach((node) => (node.parent = body));
  return holder;
}
