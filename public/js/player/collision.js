// Va chạm của người chơi cục bộ: đẩy `state.me` ra khỏi người khác, vật phẩm, tường và biên sân.
import { state, remotes } from '../state.js';
import { radiusOf } from '../core/bodySize.js';
import { confineToDuelZone } from './duelZone.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Bán kính của mình, đổi theo thuốc đang uống.
const myRadius = () => radiusOf(state.potion?.id);

// Không cho chồng lên người chơi khác, khớp với luật trên server. Khoảng cách tối thiểu = tổng hai bán kính (= MIN_DIST khi không ai uống thuốc).
function pushOutOfRemotes() {
  const { me } = state;
  const mine = myRadius();
  for (const r of remotes.values()) {
    if (r.dead) continue;
    const dx = me.x - r.root.position.x;
    const dz = me.z - r.root.position.z;
    const dist = Math.hypot(dx, dz);
    const min = mine + radiusOf(r.potion);
    if (dist >= min) continue;
    const nx = dist > 1e-4 ? dx / dist : 1;
    const nz = dist > 1e-4 ? dz / dist : 0;
    me.x = r.root.position.x + nx * min;
    me.z = r.root.position.z + nz * min;
  }
}

// Cây, bàn ghế... chặn đường như cột tròn.
function pushOutOfProps() {
  const { me } = state;
  const mine = myRadius();
  for (const c of state.colliders) {
    const dx = me.x - c.x;
    const dz = me.z - c.z;
    const dist = Math.hypot(dx, dz);
    const min = c.r + mine;
    if (dist >= min) continue;
    const nx = dist > 1e-4 ? dx / dist : 1;
    const nz = dist > 1e-4 ? dz / dist : 0;
    me.x = c.x + nx * min;
    me.z = c.z + nz * min;
  }
}

// Tường là hình chữ nhật: đẩy ra theo điểm gần nhất trên tường.
function pushOutOfWalls() {
  const { me } = state;
  const mine = myRadius();
  for (const w of state.walls) {
    const hx = w.w / 2;
    const hz = w.d / 2;
    const dx = me.x - clamp(me.x, w.x - hx, w.x + hx);
    const dz = me.z - clamp(me.z, w.z - hz, w.z + hz);
    const dist = Math.hypot(dx, dz);
    if (dist >= mine) continue;
    if (dist > 1e-4) {
      me.x += (dx / dist) * (mine - dist);
      me.z += (dz / dist) * (mine - dist);
    } else if (hx - Math.abs(me.x - w.x) < hz - Math.abs(me.z - w.z)) {
      // tâm lọt vào trong tường: đẩy ra theo cạnh gần nhất
      me.x = w.x + (me.x >= w.x ? 1 : -1) * (hx + mine);
    } else {
      me.z = w.z + (me.z >= w.z ? 1 : -1) * (hz + mine);
    }
  }
}

function clampToArena() {
  const limit = state.arena - 0.5;
  state.me.x = clamp(state.me.x, -limit, limit);
  state.me.z = clamp(state.me.z, -limit, limit);
}

export function resolveCollisions() {
  pushOutOfRemotes();
  // Lặp hai lần để góc giữa hai vật cản không đẩy người chơi lọt vào vật còn lại.
  for (let i = 0; i < 2; i++) {
    pushOutOfProps();
    pushOutOfWalls();
  }
  confineToDuelZone(); // sự kiện solo: võ sĩ trong võ đài, người xem trong vòng bo
  clampToArena();
}
