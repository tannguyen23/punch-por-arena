import { scene, solidMaterial } from '../core/scene.js';
import { CHARACTER } from '../config.js';
import { loadCharacter, createModelAvatar } from '../entities/character.js';
import { equipLoadout } from '../entities/weapons/index.js';

const { ArcRotateCamera, Color3, Color4, MeshBuilder, TransformNode, Vector3 } = BABYLON;

// Ngoại hình cố định, màu tách biệt để dễ nhìn chuyển động của từng bộ phận.
export const LOOK = { shirt: '#2e7d32', pants: '#263238', glove: '#8d6e63', skin: '#f5c7a3', hair: '#4a2f1b', pattern: 0 };

const CAMERAS = {
  front: { alpha: Math.PI / 2, beta: 1.15, radius: 4.5 },
  back: { alpha: -Math.PI / 2, beta: 1.15, radius: 4.5 },
  left: { alpha: 0, beta: 1.15, radius: 4.5 },
  right: { alpha: Math.PI, beta: 1.15, radius: 4.5 },
  three: { alpha: Math.PI / 2 - 0.6, beta: 1.12, radius: 4.5 },
};

const TINT_PREFIX = /^(shirt|pants|glove|skin|hair)_/;
const kindOf = (mesh) => TINT_PREFIX.exec(mesh.name)?.[1] ?? CHARACTER.kinds[mesh.name] ?? CHARACTER.groupKinds[mesh.parent?.name] ?? null;

function buildGround() {
  const ground = MeshBuilder.CreateGround('debugGround', { width: 12, height: 12 }, scene);
  ground.material = solidMaterial(new Color3(0.16, 0.2, 0.17), scene);

  const lines = [];
  for (let i = -6; i <= 6; i++) {
    lines.push([new Vector3(i, 0.01, -6), new Vector3(i, 0.01, 6)]);
    lines.push([new Vector3(-6, 0.01, i), new Vector3(6, 0.01, i)]);
  }
  const grid = MeshBuilder.CreateLineSystem('debugGrid', { lines }, scene);
  grid.color = new Color3(0.3, 0.36, 0.32);
  grid.isPickable = false;

  // Trục X đỏ, trục Z xanh để biết hướng nhân vật.
  const xAxis = MeshBuilder.CreateLineSystem('axisX', { lines: [[Vector3.Zero(), new Vector3(1.5, 0.02, 0)]] }, scene);
  xAxis.color = new Color3(0.8, 0.25, 0.25);
  const zAxis = MeshBuilder.CreateLineSystem('axisZ', { lines: [[Vector3.Zero(), new Vector3(0, 0.02, 1.5)]] }, scene);
  zAxis.color = new Color3(0.25, 0.45, 0.9);
}

// Tô màu model gốc giống nhân vật trong game (model chưa có màu trong file).
function tintContainer(container) {
  const materials = new Map();
  const materialFor = (hex) => {
    if (!materials.has(hex)) {
      const mat = solidMaterial(Color3.FromHexString(hex), scene);
      mat.backFaceCulling = false;
      materials.set(hex, mat);
    }
    return materials.get(hex);
  };
  for (const mesh of container.meshes) {
    if (!mesh.getTotalVertices()) continue;
    const kind = kindOf(mesh);
    const hex = kind ? (LOOK[kind] ?? CHARACTER.fixedColors[kind]) : null;
    if (hex) mesh.material = materialFor(hex);
  }
}

function scaleContainer(container, holder) {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const mesh of container.meshes) {
    if (!mesh.getTotalVertices()) continue;
    mesh.computeWorldMatrix(true);
    const box = mesh.getBoundingInfo().boundingBox;
    minY = Math.min(minY, box.minimumWorld.y);
    maxY = Math.max(maxY, box.maximumWorld.y);
  }
  const scale = CHARACTER.height / (maxY - minY);
  holder.scaling.setAll(scale);
  holder.position.y = -minY * scale; // chân chạm mặt đất
  holder.rotation.y = CHARACTER.facing;
  return scale;
}

// Dựng cảnh debug: sân lưới, camera xoay, nhân vật game (có vũ khí) và bản sao clip gốc.
export async function loadSceneView(canvas) {
  scene.clearColor = new Color4(0.09, 0.11, 0.14, 1);
  buildGround();

  const camera = new ArcRotateCamera('debugCam', CAMERAS.front.alpha, CAMERAS.front.beta, CAMERAS.front.radius, new Vector3(0, 1, 0), scene);
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 2;
  camera.upperRadiusLimit = 9;
  camera.wheelPrecision = 40;

  await loadCharacter(scene);
  const avatar = createModelAvatar(scene, 'debug', LOOK, {});
  equipLoadout(avatar.fists, 'fist');

  const container = await BABYLON.SceneLoader.LoadAssetContainerAsync('', CHARACTER.url, scene, null, '.glb');
  container.addAllToScene();
  tintContainer(container);
  const holder = new TransformNode('rawHolder', scene);
  container.rootNodes.forEach((node) => (node.parent = holder));
  scaleContainer(container, holder);
  holder.setEnabled(false); // chỉ hiện ở chế độ "Clip gốc"

  return {
    avatar,
    camera,
    groups: container.animationGroups,
    setMode(mode) {
      avatar.root.setEnabled(mode === 'game');
      holder.setEnabled(mode === 'clip');
    },
    setWeapon(id) {
      equipLoadout(avatar.fists, id);
    },
  };
}

export function setCameraPreset(camera, name) {
  const preset = CAMERAS[name] ?? CAMERAS.front;
  camera.alpha = preset.alpha;
  camera.beta = preset.beta;
  camera.radius = preset.radius;
  camera.target.set(0, 1, 0);
}
