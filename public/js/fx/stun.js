import { scene } from '../core/scene.js';
import { state, remotes } from '../state.js';
import { isStunned } from '../core/freeze.js';
import { STUN_FX } from '../config.js';

const { MeshBuilder, Vector3, Color3, VertexBuffer } = BABYLON;

// Điện giật quanh người bị choáng: một LineSystem cho mỗi người đang choáng, lấy từ pool (xong thì tắt chứ không huỷ, quy tắc 16) và đổi hình
// bằng cách ghi thẳng vào buffer toạ độ của chính nó, không dựng lại đường nào.
const active = new Map(); // id → { mesh, frame }
const pool = []; // mesh rảnh, đang tắt
const buffers = new WeakMap(); // mesh → Float32Array toạ độ các điểm (xyz, lần lượt từng hồ quang)
const POINTS = STUN_FX.arcs * STUN_FX.segments;
let refreshIn = 0;
let frame = 0;

// Ghi hình mới của mọi hồ quang vào `out`: mỗi hồ quang là một đường gấp khúc đi lên, mỗi điểm lệch ngẫu nhiên một chút.
function fillArcs(out) {
  const { arcs, segments, radius, jitter } = STUN_FX;
  let n = 0;
  for (let arc = 0; arc < arcs; arc++) {
    const angle = arc * Math.PI * 2 / arcs + Math.random();
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    for (let i = 0; i < segments; i++) {
      out[n++] = x + (Math.random() * 2 - 1) * jitter;
      out[n++] = i / (segments - 1) + (Math.random() * 2 - 1) * jitter;
      out[n++] = z + (Math.random() * 2 - 1) * jitter;
    }
  }
}

// Chỉ chạy khi pool hết mesh rảnh (lần đầu có người bị choáng, hoặc nhiều người choáng hơn trước).
function createArcs() {
  const positions = new Float32Array(POINTS * 3);
  fillArcs(positions);
  const lines = [];
  for (let arc = 0; arc < STUN_FX.arcs; arc++) {
    const line = [];
    for (let i = 0; i < STUN_FX.segments; i++) {
      const at = (arc * STUN_FX.segments + i) * 3;
      line.push(new Vector3(positions[at], positions[at + 1], positions[at + 2]));
    }
    lines.push(line);
  }
  const mesh = MeshBuilder.CreateLineSystem('stunArcs', { lines, updatable: true }, scene);
  mesh.color = new Color3(...STUN_FX.color);
  mesh.isPickable = false;
  mesh.alwaysSelectAsActiveMesh = true; // khung bao tính lúc dựng, hình đổi liên tục nên khỏi cắt theo khung nhìn (mesh rất nhỏ)
  buffers.set(mesh, positions);
  return mesh;
}

function reshape(mesh) {
  const positions = buffers.get(mesh);
  fillArcs(positions);
  mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
}

function acquire() {
  const mesh = pool.pop() ?? createArcs();
  mesh.setEnabled(true);
  reshape(mesh);
  return mesh;
}

function release(mesh) {
  mesh.setEnabled(false);
  pool.push(mesh);
}

// Dùng thử một lần ở chỗ không ai thấy lúc vào phòng (fx/warmup.js) để shader đường kẻ biên dịch trước lần choáng đầu tiên.
export function prepareStunFx(y) {
  const mesh = acquire();
  mesh.position.set(0, y, 0);
  setTimeout(() => release(mesh), 500);
}

function follow(entry, remote, refresh) {
  const { mesh } = entry;
  if (refresh) reshape(mesh);
  mesh.position.copyFrom(remote.root.position);
  const size = remote.size ?? 1;
  mesh.scaling.set(size, size * (remote.dogForm?.active ? STUN_FX.dogHeight : STUN_FX.height), size);
}

export function updateStunEffects(dt) {
  refreshIn -= dt;
  const refresh = refreshIn <= 0;
  if (refresh) refreshIn = STUN_FX.refreshSeconds;
  frame++;
  if (state.match.phase === 'playing') {
    for (const [id, remote] of remotes) {
      if (remote.dead || performance.now() >= (remote.stunnedUntil ?? 0)) continue;
      let entry = active.get(id);
      if (!entry) {
        entry = { mesh: acquire(), frame };
        active.set(id, entry);
      }
      entry.frame = frame;
      follow(entry, remote, refresh);
    }
  }
  for (const [id, entry] of active) {
    if (entry.frame === frame) continue; // không còn choáng khung này: trả mesh về pool
    release(entry.mesh);
    active.delete(id);
  }
  if (isStunned()) state.shake = Math.max(state.shake, STUN_FX.shake);
}
