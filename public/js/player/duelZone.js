import { state } from '../state.js';
import { duelOf, isFighter } from '../core/duel.js';
import { radiusOf } from '../core/bodySize.js';

// Khu vực được phép đi lại trong sự kiện solo, tính ngay trên máy mình để chạm vào vòng bo là dừng êm (xem fx/ringZone.js) thay vì bị server
// kéo giật lại. Công thức khớp `confinedSpot` ở server/game/duelRing.js (server vẫn kiểm tra lại); các con số lấy từ tin 'duel', không có bản sao riêng.
// Võ sĩ: ở trong võ đài, cách dây `fighterMargin`. Người xem: ngoài võ đài `spectatorEdge` tính từ dây và trong vòng bo `ring.leash`
// (trừ bán kính cơ thể để người không lọt ra ngoài vòng).
export function confineToDuelZone() {
  const duel = duelOf();
  const ring = state.ring;
  if (!duel || !ring) return;
  const { me } = state;
  let dx = me.x - ring.x;
  let dz = me.z - ring.z;

  if (isFighter(duel)) {
    const limit = ring.half - duel.fighterMargin;
    dx = Math.max(-limit, Math.min(limit, dx));
    dz = Math.max(-limit, Math.min(limit, dz));
  } else {
    const edge = ring.half + duel.spectatorEdge;
    if (Math.max(Math.abs(dx), Math.abs(dz)) < edge) { // lọt vào trong võ đài: đẩy ra theo trục lệch nhiều hơn
      if (Math.abs(dx) >= Math.abs(dz)) dx = (dx < 0 ? -1 : 1) * edge;
      else dz = (dz < 0 ? -1 : 1) * edge;
    }
    const limit = ring.leash - radiusOf(state.potion?.id);
    const far = Math.hypot(dx, dz);
    if (far > limit) {
      dx *= limit / far;
      dz *= limit / far;
    }
  }
  me.x = ring.x + dx;
  me.z = ring.z + dz;
}
