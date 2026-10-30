import { state, remotes, infos } from '../state.js';
import { buildArena } from '../world/arena.js';
import { disposeRemote } from '../entities/remotePlayer.js';
import { groundAt } from '../core/terrain.js';
import { clearRockets } from '../fx/rockets.js';
import { clearGrenades, syncGrenades } from '../fx/grenades.js';
import { clearStrikes } from '../fx/lightning.js';
import { setStorm } from '../fx/weather.js';
import { clearIce, spawnIce } from '../fx/icePatch.js';
import { clearNuke, startNuke } from '../fx/nuke.js';
import { setPauseVisible } from '../ui/hud.js';
import { hideMenu, showMenuError } from '../ui/menu.js';
import { copyRoomLink } from '../ui/lobbyHud.js';
import { announce } from '../ui/matchHud.js';
import { pickupHandlers, addPickup, clearPickups } from './pickupHandlers.js';
import { combatHandlers } from './combatHandlers.js';
import { bigPunchHandlers } from './bigPunchHandlers.js';
import { poopHandlers, clearPoops } from './poopHandlers.js';
import { grenadeHandlers } from './grenadeHandlers.js';
import { weatherHandlers } from './weatherHandlers.js';
import { nukeHandlers } from './nukeHandlers.js';
import { eventHandlers, applyEvent } from './eventHandlers.js';
import { tntHandlers } from './tntHandlers.js';
import { duelHandlers } from './duelHandlers.js';
import { duelAudienceHandlers } from './duelAudienceHandlers.js';
import { reloadHandlers } from './reloadHandlers.js';
import { roomHandlers } from './roomHandlers.js';
import { tableHandlers, applyTableGames } from './tableHandlers.js';
import { applySnapshot } from './snapshot.js';
import * as Sfx from '../audio/sfx.js';

// Đồng hồ của server gửi dạng "còn bao nhiêu ms"; đổi sang mốc của đồng hồ máy mình.
function applyMatch({ phase, timeLeft, ranking }) {
  state.match.phase = phase;
  state.match.endsAt = performance.now() + timeLeft;
  state.match.ranking = ranking;
}

// Bỏ những thứ đang bay / chờ nổ / còn tồn tại (server cũng bỏ khi đổi pha): tên lửa, lựu đạn, vũng băng, sét, bom hạt nhân.
function clearProjectiles() {
  clearRockets();
  clearGrenades();
  clearIce();
  clearStrikes();
  clearNuke();
}

// Sang trận mới / về phòng chờ: dọn hòm tiếp tế, tên lửa, lựu đạn, vũng băng, sét, bom còn sót.
function clearField() {
  clearPickups();
  clearPoops();
  clearProjectiles();
}

const messageHandlers = {
  ...pickupHandlers,
  ...combatHandlers,
  ...bigPunchHandlers,
  ...poopHandlers,
  ...grenadeHandlers,
  ...weatherHandlers,
  ...nukeHandlers,
  ...eventHandlers,
  ...tntHandlers,
  ...duelHandlers,
  ...duelAudienceHandlers,
  ...reloadHandlers,
  ...roomHandlers,
  ...tableHandlers,

  welcome(m) {
    state.myId = m.id;
    state.tableRules = m.tableRules;
    state.maxHp = m.maxHp;
    buildArena(m.map);
    state.me.x = m.x;
    state.me.z = m.z;
    state.me.y = groundAt(m.x, m.z, Infinity);
    for (const o of m.players) infos.set(o.id, o);
    applyTableGames(m.tables);
    state.tableNuke = Boolean(m.nuke);
    state.weaponTypes = m.weapons;
    state.potionTypes = m.potions;
    state.room = m.room;
    hideMenu();
    try {
      history.replaceState(null, '', `?room=${m.room.code}`); // thanh địa chỉ cũng là link mời
    } catch {}
    if (m.room.created) copyRoomLink();
    applyMatch(m.match);
    setStorm(m.match.weather.storm); // vào giữa lúc đang bão thì mưa luôn, không chuyển dần
    applyEvent(m.match.event);
    m.pickups.forEach(addPickup); // hòm đang rơi / đã nằm trên sân (máy bay có thể vẫn đang bay)
    m.ice.forEach(({ left, ...patch }) => spawnIce({ ...patch, life: left })); // vũng băng còn tồn tại
    if (m.nuke) startNuke(m.nuke); // bom hạt nhân đang tới: vào giữa chừng cũng nghe và thấy phần còn lại
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
    if (m.map) {
      buildArena(m.map);
      state.room.mapId = m.map.id;
      state.room.mapName = m.map.name;
      state.me.y = groundAt(state.me.x, state.me.z, Infinity);
      state.vy = 0;
    }
    if (!m.cancelled) {
      clearField();
      state.match.ranking = [];
    }
    announce(m.map
      ? `Map mới: ${m.map.name} · Bấm F khi sẵn sàng`
      : m.cancelled ? 'Đã huỷ đếm ngược' : 'Về phòng chờ. Bấm F khi sẵn sàng');
  },

  start(m) {
    state.tableNuke = false;
    clearField();
    state.match.phase = 'playing';
    state.match.endsAt = performance.now() + m.duration;
    state.match.ranking = [];
    Sfx.horn();
    announce('TRẬN MỚI BẮT ĐẦU!');
  },

  end(m) {
    state.tableNuke = false;
    clearProjectiles();
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
    // Đứng trên đất (hoặc mặt cầu nếu đang ở trên cầu). Hồi sinh có kèm `y`: chân lúc rơi xuống hư không còn ở rất thấp,
    // tính theo độ cao đó thì chỗ hồi sinh trên cầu nổi không nhận chân và người chơi rơi mãi. Không có đất thì giữ độ cao cũ.
    const ground = groundAt(m.x, m.z, m.y ?? state.me.y);
    if (Number.isFinite(ground)) state.me.y = ground;
    state.vy = 0;
    if (m.yaw !== undefined) { // dịch chuyển có hướng nhìn (sự kiện solo: quay mặt vào võ đài)
      state.yaw = m.yaw;
      state.pitch = 0;
    }
  },

  snap(m) {
    state.match.endsAt = performance.now() + m.mt; // server hiệu chỉnh đồng hồ mỗi lần gửi snapshot
    state.match.phase = m.ph;
    applySnapshot(m.players);
    syncGrenades(m.gr);
  },

  leave(m) {
    if (m.kicked) announce(`${infos.get(m.id)?.name ?? 'Một người'} bị chủ phòng mời ra khỏi phòng`);
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
