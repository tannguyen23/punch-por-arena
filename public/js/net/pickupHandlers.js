import { state, pickups, infos } from '../state.js';
import { createPickup, disposePickup, clearPlanes } from '../entities/pickup.js';
import { announce } from '../ui/matchHud.js';
import { playAt } from './positional.js';
import * as Fx from '../fx/effects.js';
import * as Sfx from '../audio/sfx.js';

const HUM_REFERENCE = 30; // tiếng máy bay còn nửa âm lượng ở khoảng cách 2 × ngần này (mét): máy bay to nên nghe được từ xa

const hums = new Map(); // id hòm → tiếng máy bay đang chở nó

// Hòm chạm đất: tiếng đập (nghe theo vị trí), tia lửa và ngôi sao. Cả chuyến chỉ báo chữ một lần ở hòm đầu.
function onLand(pickup) {
  const { x, y, z } = pickup.root.position;
  playAt('thud', pickup.root.position);
  Fx.burst(x, y + 0.6, z, 16);
  Fx.flash(x, y + 1.2, z);
  if (pickup.firstDrop) announce('HÒM TIẾP TẾ ĐÃ RƠI!');
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
  clearPlanes();
  for (const pickup of pickups.values()) disposePickup(pickup);
  pickups.clear();
  refreshLanding();
}

// Mình vừa nhặt: báo tên vũ khí và số đạn (dao: số lần chém) cho chắc chắn biết đang cầm gì; thuốc thì báo đã uống.
// `bonus`: lựu đạn thưởng trong hòm đã vào túi (túi đầy thì nó văng ra sân, server gửi riêng bằng tin 'drop').
function announcePickup({ weapon, potion, ammo }, bonus) {
  if (potion) {
    const type = state.potionTypes[potion];
    if (type) announce(`ĐÃ UỐNG ${type.name.toUpperCase()}!`);
    return;
  }
  const info = state.weaponTypes[weapon];
  if (!info) return;
  const amount = ammo === null || ammo === undefined ? '' : ` · ${ammo} ${info.kind === 'melee' ? 'lần chém' : 'viên'}`;
  const extra = state.weaponTypes[bonus];
  const rarity = info.rarity ? ` [${info.rarity.name.toUpperCase()}]` : '';
  announce(`NHẶT ĐƯỢC ${info.name.toUpperCase()}${rarity}${amount}${extra ? ` + ${extra.name.toUpperCase()}` : ''}`);
}

export const pickupHandlers = {
  // Máy bay vừa xuất hiện: báo động và đếm ngược tới lúc hòm chạm đất. `by` = người gọi máy bay thả radio (máy bay tiếp tế định kỳ thì null).
  // `quiet`: hòm thứ hai trở đi của cùng một đợt, đã báo động ở hòm đầu nên không kêu lại.
  airdrop(m) {
    addPickup(m.pickup);
    if (m.quiet) return;
    Sfx.warning();
    const caller = m.by === null ? null : m.by === state.myId ? 'BẠN' : (infos.get(m.by)?.name ?? '...').toUpperCase();
    announce(caller ? `${caller} GỌI MÁY BAY THẢ RADIO GỌI BOM!` : 'MÁY BAY TIẾP TẾ ĐANG TỚI!');
  },

  // Lọ thuốc mới xuất hiện trên sân (không máy bay): ai cũng thấy vòng sáng và chạy tới nhặt.
  potiondrop(m) {
    addPickup(m.pickup);
    announce('CÓ THUỐC MỚI TRÊN SÂN!');
  },

  // Có vũ khí rơi ra sân (bấm G, người chết văng cả túi, lựu đạn thưởng không vừa túi): ai cũng thấy và nhặt được.
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
        announcePickup(pickup, m.bonus);
      } else {
        playAt('pickup', pickup.root.position);
      }
      disposePickup(pickup);
    }
    pickups.delete(m.id);
    refreshLanding();
  },
};
