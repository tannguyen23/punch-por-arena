import { state, remotes, infos } from '../state.js';
import { buildArena } from '../world/arena.js';
import { disposeRemote } from '../entities/remotePlayer.js';
import { groundAt } from '../core/terrain.js';
import { clearRockets } from '../fx/rockets.js';
import { setPauseVisible } from '../ui/hud.js';
import { hideMenu, showMenuError } from '../ui/menu.js';
import { copyRoomLink } from '../ui/lobbyHud.js';
import { announce } from '../ui/matchHud.js';
import { pickupHandlers, addPickup, clearPickups } from './pickupHandlers.js';
import { combatHandlers } from './combatHandlers.js';
import { applySnapshot } from './snapshot.js';
import * as Sfx from '../audio/sfx.js';

// Đồng hồ của server gửi dạng "còn bao nhiêu ms"; đổi sang mốc của đồng hồ máy mình.
function applyMatch({ phase, timeLeft, ranking }) {
  state.match.phase = phase;
  state.match.endsAt = performance.now() + timeLeft;
  state.match.ranking = ranking;
}

// Sang trận mới / về phòng chờ: dọn hòm tiếp tế và tên lửa còn sót.
function clearField() {
  clearPickups();
  clearRockets();
}

const messageHandlers = {
  ...pickupHandlers,
  ...combatHandlers,

  welcome(m) {
    state.myId = m.id;
    state.maxHp = m.maxHp;
    buildArena(m.map);
    state.me.x = m.x;
    state.me.z = m.z;
    state.me.y = groundAt(m.x, m.z, Infinity);
    for (const o of m.players) infos.set(o.id, o);
    state.weaponTypes = m.weapons;
    state.room = m.room;
    hideMenu();
    try {
      history.replaceState(null, '', `?room=${m.room.code}`); // thanh địa chỉ cũng là link mời
    } catch {}
    if (m.room.created) copyRoomLink();
    applyMatch(m.match);
    m.pickups.forEach(addPickup); // hòm đang rơi / đã nằm trên sân (máy bay có thể vẫn đang bay)
  },

  // Server từ chối cho vào phòng (sai mã, phòng đầy...): về lại menu để thử lại.
  error(m) {
    state.joined = false;
    document.exitPointerLock();
    setPauseVisible(false);
    showMenuError(m.reason);
  },

  // Đủ người và ai cũng sẵn sàng: đếm ngược 3-2-1 (số hiển thị trong ui/lobbyHud.js).
  countdown(m) {
    state.match.phase = 'countdown';
    state.match.endsAt = performance.now() + m.duration;
  },

  // Về phòng chờ: sau khi hết giờ nghỉ, hoặc đếm ngược bị huỷ (có người bỏ sẵn sàng / vào thêm / thoát).
  lobby(m) {
    state.match.phase = 'lobby';
    if (!m.cancelled) {
      clearField();
      state.match.ranking = [];
    }
    announce(m.cancelled ? 'Đã huỷ đếm ngược' : 'Về phòng chờ. Bấm F khi sẵn sàng');
  },

  start(m) {
    clearField();
    state.match.phase = 'playing';
    state.match.endsAt = performance.now() + m.duration;
    state.match.ranking = [];
    Sfx.horn();
    announce('TRẬN MỚI BẮT ĐẦU!');
  },

  end(m) {
    clearRockets();
    state.match.phase = 'ended';
    state.match.endsAt = performance.now() + m.intermission;
    state.match.ranking = m.ranking;
    Sfx.fanfare();
  },

  join(m) {
    infos.set(m.id, m);
  },

  setpos(m) {
    state.me.x = m.x;
    state.me.z = m.z;
    state.me.y = groundAt(m.x, m.z, state.me.y); // đứng trên đất (hoặc mặt cầu nếu đang ở trên cầu)
    state.vy = 0;
  },

  snap(m) {
    state.match.endsAt = performance.now() + m.mt; // server hiệu chỉnh đồng hồ mỗi lần gửi snapshot
    state.match.phase = m.ph;
    applySnapshot(m.players);
  },

  leave(m) {
    const r = remotes.get(m.id);
    if (r) disposeRemote(r);
    remotes.delete(m.id);
    infos.delete(m.id);
  },
};

export function handleMessage(e) {
  const m = JSON.parse(e.data);
  messageHandlers[m.t]?.(m);
}
