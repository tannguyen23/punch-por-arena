import { state, pickups, infos } from '../state.js';
import { createPickup, disposePickup } from '../entities/pickup.js';
import { announce } from '../ui/matchHud.js';
import { playAt } from './positional.js';
import * as Fx from '../fx/effects.js';
import * as Sfx from '../audio/sfx.js';

const HUM_REFERENCE = 30; // tiếng máy bay còn nửa âm lượng ở khoảng cách 2 × ngần này (mét): máy bay to nên nghe được từ xa

const hums = new Map(); // id hòm → tiếng máy bay đang chở nó

// Hòm chạm đất: tiếng đập (nghe theo vị trí), tia lửa và ngôi sao.
function onLand(pickup) {
  const { x, y, z } = pickup.root.position;
  playAt('thud', pickup.root.position);
  Fx.burst(x, y + 0.6, z, 16);
  Fx.flash(x, y + 1.2, z);
  announce('HÒM TIẾP TẾ ĐÃ RƠI!');
  refreshLanding();
}

// Máy bay di chuyển: tiếng động cơ to dần khi lại gần, lệch trái/phải theo hướng nhìn; biến mất thì tắt.
function onPlane(pickup, position) {
  let hum = hums.get(pickup.id);
  if (!position) {
    hum?.stop();
    hums.delete(pickup.id);
    return;
  }
  if (!hum) hums.set(pickup.id, (hum = Sfx.planeHum()));
  const { me } = state;
  const dist = Math.hypot(position.x - me.x, position.y - me.y, position.z - me.z);
  const { pan } = Sfx.levelsAt(position.x, position.z, me.x, me.z, state.yaw, dist);
  hum.set(pan, HUM_REFERENCE / (HUM_REFERENCE + dist));
}

// Đồng hồ đếm ngược trên màn hình (ui/matchHud.js) chỉ tới lúc hòm sắp chạm đất sớm nhất.
function refreshLanding() {
  const now = performance.now();
  const next = Math.min(...[...pickups.values()].filter((p) => p.landAt > now).map((p) => p.landAt));
  state.match.wave = Number.isFinite(next) ? { at: next } : null;
}

export function addPickup(m) {
  if (!pickups.has(m.id)) pickups.set(m.id, createPickup(m, { onLand, onPlane }));
  refreshLanding();
}

export function clearPickups() {
  for (const pickup of pickups.values()) disposePickup(pickup);
  pickups.clear();
  refreshLanding();
}

// Mình vừa nhặt: báo tên vũ khí và số đạn (dao: số lần chém) cho chắc chắn biết đang cầm gì.
function announcePickup({ weapon, ammo }) {
  const info = state.weaponTypes[weapon];
  if (!info) return;
  const amount = ammo === null || ammo === undefined ? '' : ` · ${ammo} ${info.kind === 'melee' ? 'lần chém' : 'viên'}`;
  announce(`NHẶT ĐƯỢC ${info.name.toUpperCase()}${amount}`);
}

export const pickupHandlers = {
  // Máy bay vừa xuất hiện: báo động và đếm ngược tới lúc hòm chạm đất. `by` = người gọi máy bay thả radio (máy bay tiếp tế định kỳ thì null).
  airdrop(m) {
    addPickup(m.pickup);
    Sfx.warning();
    const caller = m.by === null ? null : m.by === state.myId ? 'BẠN' : (infos.get(m.by)?.name ?? '...').toUpperCase();
    announce(caller ? `${caller} GỌI MÁY BAY THẢ RADIO GỌI BOM!` : 'MÁY BAY TIẾP TẾ ĐANG TỚI!');
  },

  // Có người vứt vũ khí (còn đạn) xuống đất: ai cũng thấy và nhặt được.
  drop(m) {
    addPickup(m.pickup);
    if (m.by === state.myId) Sfx.thud(0, 0.5);
    else playAt('thud', pickups.get(m.pickup.id).root.position);
  },

  pickup(m) {
    const pickup = pickups.get(m.id);
    if (pickup) {
      if (m.by === state.myId) {
        Sfx.pickup(0, 1);
        announcePickup(pickup);
      } else {
        playAt('pickup', pickup.root.position);
      }
      disposePickup(pickup);
    }
    pickups.delete(m.id);
    refreshLanding();
  },
};
