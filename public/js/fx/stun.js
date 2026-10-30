import { scene } from '../core/scene.js';
import { state, remotes } from '../state.js';
import { isStunned } from '../core/freeze.js';
import { STUN_FX } from '../config.js';

const { MeshBuilder, Vector3, Color3 } = BABYLON;
const effects = new Map();
let refreshIn = 0;

function arcLines() {
  return Array.from({ length: STUN_FX.arcs }, (_, arc) => {
    const angle = arc * Math.PI * 2 / STUN_FX.arcs + Math.random();
    return Array.from({ length: STUN_FX.segments }, (_, i) => {
      const jitter = () => (Math.random() * 2 - 1) * STUN_FX.jitter;
      return new Vector3(
        Math.sin(angle) * STUN_FX.radius + jitter(),
        i / (STUN_FX.segments - 1) + jitter(),
        Math.cos(angle) * STUN_FX.radius + jitter(),
      );
    });
  });
}

function updateArcs(id, remote, refresh) {
  let mesh = effects.get(id);
  if (!mesh) {
    mesh = MeshBuilder.CreateLineSystem('stunArcs', { lines: arcLines(), updatable: true }, scene);
    mesh.color = new Color3(...STUN_FX.color);
    mesh.isPickable = false;
    effects.set(id, mesh);
  } else if (refresh) {
    MeshBuilder.CreateLineSystem('stunArcs', { lines: arcLines(), instance: mesh }, scene);
  }
  mesh.position.copyFrom(remote.root.position);
  const size = remote.size ?? 1;
  mesh.scaling.set(size, size * (remote.dogForm?.active ? STUN_FX.dogHeight : STUN_FX.height), size);
}

export function updateStunEffects(dt) {
  refreshIn -= dt;
  const refresh = refreshIn <= 0;
  if (refresh) refreshIn = STUN_FX.refreshSeconds;
  const active = new Set();
  if (state.match.phase === 'playing') {
    for (const [id, remote] of remotes) {
      if (remote.dead || performance.now() >= (remote.stunnedUntil ?? 0)) continue;
      active.add(id);
      updateArcs(id, remote, refresh);
    }
  }
  for (const [id, mesh] of effects) {
    if (active.has(id)) continue;
    mesh.dispose();
    effects.delete(id);
  }
  if (isStunned()) state.shake = Math.max(state.shake, STUN_FX.shake);
}
