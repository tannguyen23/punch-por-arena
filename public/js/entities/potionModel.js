import { scene, solidMaterial } from '../core/scene.js';
import { POTION } from '../config.js';

const { TransformNode, Color3 } = BABYLON;

// Lọ thuốc từ potion.glb (gốc ở đáy lọ, không có màu). Nạp một lần, mỗi lọ trên sân là một bản sao; màu tô theo tên khối (POTION.kinds)
// và loại thuốc (POTION.liquid). Material dùng chung theo màu nên huỷ lọ không được kèm material (pickup.js dispose không có tham số thứ hai).
const materials = new Map(); // màu → material
function colorMaterial(hex, glow) {
  if (!materials.has(hex)) {
    const mat = solidMaterial(Color3.FromHexString(hex));
    mat.backFaceCulling = false;
    if (glow) mat.emissiveColor = Color3.FromHexString(hex).scale(0.55); // nước thuốc hơi phát sáng cho dễ thấy từ xa
    materials.set(hex, mat);
  }
  return materials.get(hex);
}

let template = null; // Promise<{ container, scale, midY } | null>

async function load() {
  const container = await BABYLON.SceneLoader.LoadAssetContainerAsync('', POTION.url, scene, null, '.glb');
  let minY = Infinity;
  let maxY = -Infinity;
  for (const mesh of container.meshes) {
    if (!mesh.getTotalVertices()) continue;
    mesh.computeWorldMatrix(true);
    const box = mesh.getBoundingInfo().boundingBox;
    minY = Math.min(minY, box.minimumWorld.y);
    maxY = Math.max(maxY, box.maximumWorld.y);
  }
  return { container, scale: POTION.height / (maxY - minY), midY: (minY + maxY) / 2 };
}

// Dựng một lọ thuốc loại `id` có tâm ở giữa lọ (để lơ lửng và xoay quanh trục đứng). Null nếu nạp lỗi.
export async function createPotionModel(id) {
  template ??= load().catch((err) => {
    console.error('Không nạp được lọ thuốc:', err);
    return null;
  });
  const loaded = await template;
  if (!loaded) return null;
  const holder = new TransformNode('potion', scene);
  holder.scaling.setAll(loaded.scale);
  const body = new TransformNode('potionBody', scene);
  body.parent = holder;
  body.position.y = -loaded.midY;
  // doNotInstantiate: bản sao thật chứ không phải InstancedMesh, vì mỗi lọ phải đổi được material theo loại thuốc.
  const { rootNodes } = loaded.container.instantiateModelsToScene((name) => name, false, { doNotInstantiate: true });
  rootNodes.forEach((node) => (node.parent = body));
  for (const mesh of body.getChildMeshes(false)) {
    const kind = POTION.kinds[mesh.name];
    if (kind === 'liquid') mesh.material = colorMaterial(POTION.liquid[id] ?? '#ffffff', true);
    else if (kind) mesh.material = colorMaterial(POTION.colors[kind]);
  }
  return holder;
}
