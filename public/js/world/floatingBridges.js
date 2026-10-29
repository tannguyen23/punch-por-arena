import { scene } from '../core/scene.js';
import { box, colorMaterial } from '../core/meshes.js';

const PLANK = '#8b6344';
const PLANK_ALT = '#745137';

export function createFloatingBridges(bridges, parent) {
  for (const bridge of bridges) {
    const root = new BABYLON.TransformNode('floating-bridge', scene);
    root.parent = parent;
    root.position.set(bridge.x, 0, bridge.z);
    root.rotation.y = bridge.axis === 'x' ? Math.PI / 2 : 0;
    const count = Math.ceil(bridge.length / 0.7);
    const step = bridge.length / count;
    const planks = [[], []];
    for (let i = 0; i < count; i++) {
      const mesh = box(bridge.width, 0.16, step - 0.04);
      mesh.position.set(0, bridge.deckY - 0.08, -bridge.length / 2 + step * (i + 0.5));
      planks[i % 2].push(mesh);
    }
    for (let i = 0; i < planks.length; i++) {
      const merged = BABYLON.Mesh.MergeMeshes(planks[i], true);
      if (!merged) continue;
      merged.parent = root;
      merged.material = colorMaterial(i ? PLANK_ALT : PLANK);
      merged.freezeWorldMatrix();
    }
  }
}
