import { solidMaterial } from '../core/scene.js';
import { JETPACK } from '../config.js';

const { TransformNode, Color3, Vector3, Quaternion, Matrix } = BABYLON;

// Động cơ phản lực đeo sau lưng nhân vật model, dựng từ jet_engine.glb (model Blockbench không có màu, có clip `run` xoay 4 cánh quạt).
// Mỗi scene nạp một lần (như character.js). Màu động cơ giống nhau với mọi người nên mesh mẫu và material được dựng một lần, mỗi người chỉ là
// một bản INSTANCE của mesh mẫu (Babylon gom các bản cùng mesh gốc vào một draw call: cả phòng ~14 thay vì 14 × số người).
// Cửa sổ ra ngoài chỉ có `fans` (nơi fx/jetFx.js phun lửa / khí) và setSpin (bật / tắt quạt quay), không biết gì về dash.
const loading = new WeakMap(); // scene → Promise<template | null>
const templates = new WeakMap(); // scene → template, có khi nạp xong

// Kích thước và tâm của model tính trong hệ toạ độ lúc nạp (đã gồm phép lật z của file glTF), để căn giữa và co về JETPACK.width.
async function load(scene) {
  const container = await BABYLON.SceneLoader.LoadAssetContainerAsync('', JETPACK.url, scene, null, '.glb');
  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);
  for (const mesh of container.meshes) {
    if (!mesh.getTotalVertices()) continue;
    mesh.computeWorldMatrix(true);
    const box = mesh.getBoundingInfo().boundingBox;
    min.minimizeInPlace(box.minimumWorld);
    max.maximizeInPlace(box.maximumWorld);
  }
  const size = max.subtract(min);
  const shared = buildShared(scene, container);
  return { container, size, center: min.add(max).scale(0.5), scale: JETPACK.width / size.x, ...shared };
}

export function loadJetpack(scene) {
  if (!loading.has(scene)) {
    loading.set(
      scene,
      load(scene)
        .then((template) => {
          templates.set(scene, template);
          return template;
        })
        .catch((err) => {
          console.error('Không nạp được động cơ phản lực:', err);
          return null;
        }),
    );
  }
  return loading.get(scene);
}

// Bộ phận của một khối: theo tên khối, rồi theo tên nhóm cha gần nhất có trong JETPACK.groups (hầu hết khối đều tên `cube`).
function kindOf(mesh) {
  if (JETPACK.kinds[mesh.name]) return JETPACK.kinds[mesh.name];
  for (let node = mesh.parent; node; node = node.parent) if (JETPACK.groups[node.name]) return JETPACK.groups[node.name];
  return null;
}

// Material dùng chung cho mọi người. dispose(false, true) nhân vật sẽ huỷ material của từng mesh, nên nếu để nguyên thì người đầu tiên thoát phòng
// làm động cơ của tất cả mọi người mất màu. Vì vậy dispose bị vô hiệu cho tới khi scene bị huỷ.
function sharedMaterial(scene, kind) {
  const mat = solidMaterial(Color3.FromHexString(JETPACK.colors[kind]), scene);
  mat.backFaceCulling = false;
  if (JETPACK.glow[kind]) mat.emissiveColor = Color3.FromHexString(JETPACK.glow[kind]);
  const dispose = mat.dispose.bind(mat);
  mat.dispose = () => {};
  scene.onDisposeObservable.add(dispose);
  return mat;
}

// Bản mẫu duy nhất: nhân vật mới chỉ tạo instance của các mesh này. Mesh mẫu và cây node của nó nằm ẩn trong scene (isVisible = false vẫn vẽ được instance).
function buildShared(scene, container) {
  const { rootNodes, animationGroups } = container.instantiateModelsToScene((name) => name, false, { doNotInstantiate: true });
  const node = new TransformNode('jetTemplate', scene);
  rootNodes.forEach((child) => (child.parent = node));
  const materials = new Map();
  for (const mesh of node.getChildMeshes(false)) {
    mesh.isVisible = false;
    mesh.isPickable = false;
    const kind = kindOf(mesh);
    if (!kind) continue;
    if (!materials.has(kind)) materials.set(kind, sharedMaterial(scene, kind));
    mesh.material = materials.get(kind);
  }
  const spin = animationGroups.find((group) => /run/i.test(group.name)) ?? null;
  animationGroups.forEach((group) => group !== spin && group.dispose());
  spin?.stop();
  return { node, spin };
}

// Neo gắn vào khối thân nên đi theo hoạt ảnh của thân (đứng yên, đấm, nhảy, ngã). Tính một lần ở tư thế đứng yên bằng ma trận nghịch đảo
// (giống createHandAnchor trong character.js) để động cơ đúng cỡ và không bị lật gương dù khối thân mang phép lật z của model.
// Nhân vật quay mặt về +Z (CHARACTER.facing) nên sau lưng là -Z. Gọi khi `body` chưa bị dời khỏi gốc toạ độ (ngay lúc dựng nhân vật).
function createMount(scene, torso, template) {
  torso.computeWorldMatrix(true);
  const box = torso.getBoundingInfo().boundingBox;
  const depth = template.size.z * template.scale;
  const position = new Vector3(
    box.centerWorld.x,
    box.centerWorld.y + JETPACK.up,
    box.centerWorld.z - box.extendSizeWorld.z - JETPACK.gap - depth / 2,
  );
  const rotation = Quaternion.RotationYawPitchRoll(JETPACK.yaw, JETPACK.pitch, JETPACK.roll);
  const wanted = Matrix.Compose(new Vector3(template.scale, template.scale, template.scale), rotation, position);
  const local = wanted.multiply(Matrix.Invert(torso.getWorldMatrix()));
  const mount = new TransformNode('jetMount', scene);
  mount.parent = torso;
  mount.rotationQuaternion = new Quaternion();
  local.decompose(mount.scaling, mount.rotationQuaternion, mount.position);
  return mount;
}

// Gắn động cơ vào nhân vật model `body` (nút chứa các khối của file char.glb). Null nếu model chưa nạp xong hoặc không tìm thấy khối thân.
export function attachJetpack(scene, body) {
  const template = templates.get(scene);
  const torso = body.getChildMeshes(false).find((m) => m.name === JETPACK.mount);
  if (!template || !torso) return null;

  const mount = createMount(scene, torso, template);
  const content = new TransformNode('jetModel', scene);
  content.parent = mount;
  content.position.copyFrom(template.center).scaleInPlace(-1); // tâm model về gốc của neo
  // Cây node của mẫu được sao chép (node thường nhân bản, mesh thành instance dùng chung hình và material). Hoạt ảnh quạt nhân bản theo,
  // trỏ vào các node vừa sao chép nên mỗi người quay quạt riêng.
  const copies = new Map();
  template.node.instantiateHierarchy(content, undefined, (source, copy) => copies.set(source, copy));
  const spinGroup = template.spin?.clone('spin', (target) => copies.get(target) ?? target) ?? null;
  const fans = content.getChildMeshes(false).filter((m) => JETPACK.fanMeshes.test(m.name) && m.getClassName() === 'InstancedMesh');

  const jet = {
    fans,
    disposed: false,
    spin: 0, // 0 = quạt đứng yên, 1 = quay hết cỡ
    spinTarget: 0,
    setSpin(on) {
      this.spinTarget = on ? 1 : 0;
    },
    // Quạt lên vòng / chậm dần rồi dừng. Chỉ ghi vào animation group khi tốc độ đổi (đứng yên hoặc đã quay đều thì không làm gì).
    update(dt) {
      if (!spinGroup || this.spin === this.spinTarget) return;
      this.spin += (this.spinTarget - this.spin) * (1 - Math.exp(-JETPACK.spin.ease * dt));
      if (Math.abs(this.spinTarget - this.spin) < 0.01) this.spin = this.spinTarget;
      if (this.spin === 0) spinGroup.stop();
      else if (spinGroup.isStarted) spinGroup.speedRatio = this.spin * JETPACK.spin.speed;
      else spinGroup.start(true, this.spin * JETPACK.spin.speed);
    },
  };
  mount.onDisposeObservable.add(() => {
    jet.disposed = true;
    spinGroup?.dispose();
  });
  return jet;
}
