import { scene } from '../core/scene.js';
import { state } from '../state.js';
import { TABLE_MODEL, TABLE_BOARD } from '../config.js';
import { createTableBoard } from './tableBoard.js';

let template = null;

async function load() {
  const container = await BABYLON.SceneLoader.LoadAssetContainerAsync('', TABLE_MODEL.url, scene, null, '.glb');
  let minY = Infinity;
  let maxY = -Infinity;
  for (const mesh of container.meshes) {
    if (!mesh.getTotalVertices()) continue;
    mesh.computeWorldMatrix(true);
    const bounds = mesh.getBoundingInfo().boundingBox;
    minY = Math.min(minY, bounds.minimumWorld.y);
    maxY = Math.max(maxY, bounds.maximumWorld.y);
    const color = TABLE_MODEL.colors[mesh.name];
    if (color && mesh.material) mesh.material.albedoColor = BABYLON.Color3.FromHexString(color);
  }
  if (!Number.isFinite(maxY - minY) || maxY <= minY) throw new Error('Model bàn không có kích thước hợp lệ');
  return { container, scale: TABLE_MODEL.height / (maxY - minY), minY };
}

function setFlipped(entry, flipped) {
  if (entry.flipped === flipped) return;
  entry.flipped = flipped;
  if (!entry.clip) return;
  entry.clip.stop();
  entry.clip.reset();
  if (flipped) entry.clip.start(false);
  else {
    for (const { node, position, rotation, scaling } of entry.rest) {
      node.position.copyFrom(position);
      if (rotation) node.rotationQuaternion.copyFrom(rotation);
      node.scaling.copyFrom(scaling);
    }
  }
}

export function syncTableModels() {
  for (const [id, entry] of state.tableModels) {
    const game = state.tableGames.find((game) => game.id === id);
    entry.board.update(game);
    setFlipped(entry, game?.stage === 'finished' && game.reason === 'flip');
  }
}

export async function createTableModel(root, id) {
  try {
    template ??= load();
    const loaded = await template;
    if (root.isDisposed()) return;
    const holder = new BABYLON.TransformNode('tableModel', scene);
    holder.parent = root;
    holder.scaling.setAll(loaded.scale);
    holder.position.y = -loaded.minY * loaded.scale;
    const instance = loaded.container.instantiateModelsToScene((name) => name, false, { doNotInstantiate: true });
    instance.rootNodes.forEach((node) => (node.parent = holder));
    const clip = instance.animationGroups.find((group) => group.name === TABLE_MODEL.flipClip);
    if (!clip) console.error('Model bàn thiếu hoạt ảnh:', TABLE_MODEL.flipClip);
    const rest = holder.getDescendants().map((node) => ({
      node, position: node.position.clone(), rotation: node.rotationQuaternion?.clone(), scaling: node.scaling.clone(),
    }));
    const surface = holder.getChildMeshes().find((mesh) => mesh.name === TABLE_BOARD.surface);
    if (!surface) throw new Error('Model bàn thiếu mặt bàn để vẽ cờ');
    const entry = { root, clip, rest, board: createTableBoard(surface), flipped: false };
    state.tableModels.set(id, entry);
    root.onDisposeObservable.addOnce(() => {
      instance.animationGroups.forEach((group) => group.dispose());
      if (state.tableModels.get(id) === entry) state.tableModels.delete(id);
    });
    syncTableModels();
  } catch (error) {
    console.error('Không nạp được model bàn:', error);
  }
}
