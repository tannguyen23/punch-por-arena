// Lựu đạn đang bay / nằm chờ nổ. Server mô phỏng và gửi vị trí trong snapshot (`gr`); giữa hai snapshot ở đây tự đoán
// bằng trọng lực rồi kéo dần về vị trí server cho khỏi giật. Hình quả lựu đạn là chính model của vũ khí đó.
import { createWeaponModel } from '../entities/weapons/index.js';
import { groundAt } from '../core/terrain.js';
import { GRENADE_FX } from '../config.js';

const { Vector3 } = BABYLON;

const live = new Map(); // id → { root, shown, base, vel, since, age }

// Vị trí đoán theo trọng lực sau `t` giây kể từ lần server báo gần nhất, không chui xuống đất.
function predict(g, t) {
  const p = g.base.add(g.vel.scale(t));
  p.y -= 0.5 * GRENADE_FX.gravity * t * t;
  p.y = Math.max(p.y, groundAt(p.x, p.z, g.base.y) + GRENADE_FX.radius);
  return p;
}

// Lựu đạn mới (tin nhắn 'throw', hoặc thấy lần đầu trong snapshot khi vừa vào phòng).
export function addGrenade({ id, w, from, vel }) {
  if (live.has(id)) return;
  const g = { root: null, shown: new Vector3(...from), base: new Vector3(...from), vel: new Vector3(...vel), since: 0, age: 0 };
  live.set(id, g);
  createWeaponModel(w).then((model) => {
    if (!model) return;
    if (live.get(id) !== g) {
      model.dispose(); // đã nổ trong lúc dựng
      return;
    }
    g.root = model;
    model.position.copyFrom(g.shown);
  });
}

export function removeGrenade(id) {
  live.get(id)?.root?.dispose();
  live.delete(id);
}

export function clearGrenades() {
  for (const id of [...live.keys()]) removeGrenade(id);
}

// Snapshot: [id, vũ khí, x, y, z, vx, vy, vz] từng quả. Quả không còn trong danh sách mà chưa nhận 'detonate' thì để
// maxAge tự dọn (tin nhắn nổ có thể tới sau snapshot).
export function syncGrenades(list) {
  for (const [id, w, x, y, z, vx, vy, vz] of list) {
    const g = live.get(id);
    if (!g) {
      addGrenade({ id, w, from: [x, y, z], vel: [vx, vy, vz] });
      continue;
    }
    g.base.set(x, y, z);
    g.vel.set(vx, vy, vz);
    g.since = 0;
  }
}

export function updateGrenades(dt) {
  const pull = 1 - Math.exp(-GRENADE_FX.correct * dt);
  for (const [id, g] of live) {
    g.age += dt;
    g.since += dt;
    if (g.age > GRENADE_FX.maxAge) {
      removeGrenade(id);
      continue;
    }
    g.shown = Vector3.Lerp(g.shown, predict(g, g.since), pull);
    if (!g.root) continue;
    g.root.position.copyFrom(g.shown);
    if (g.vel.length() > 0.5) g.root.rotation.x += GRENADE_FX.spin * dt; // đang bay / lăn thì xoay
  }
}
