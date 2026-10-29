import { state, remotes, infos, pickups } from '../state.js';
import { buildArena } from '../world/arena.js';
import { createRemote, disposeRemote } from '../entities/remotePlayer.js';
import { createPickup, disposePickup } from '../entities/pickup.js';
import { equipLoadout, WEAPON_MODELS } from '../entities/weapons/index.js';
import { groundAt } from '../core/terrain.js';
import { spawnHitEffects } from '../fx/hitEffects.js';
import { flashDamage, flashCrosshairHit, updateHud, setPauseVisible } from '../ui/hud.js';
import { hideMenu, showMenuError } from '../ui/menu.js';
import { copyRoomLink } from '../ui/lobbyHud.js';
import { announce } from '../ui/matchHud.js';
import * as Fx from '../fx/effects.js';
import * as Sfx from '../audio/sfx.js';

// Vị trí để phát âm thanh/hiệu ứng: của mình hoặc của người chơi khác (nếu đã có trong sân).
const positionOf = (id) => (id === state.myId ? state.me : remotes.get(id)?.root.position);

const playAt = (kind, pos) => pos && Sfx.at(kind, pos.x, pos.z, state.me.x, state.me.z, state.yaw);

// Vũ khí chạm đất: tiếng đập (nghe theo vị trí), tia lửa và ngôi sao.
function landEffects(pickup) {
  const { x, y, z } = pickup.root.position;
  playAt('thud', pickup.root.position);
  Fx.burst(x, y + 0.3, z, 16);
  Fx.flash(x, y + 0.7, z);
}

// `fall`: vũ khí vừa được thả xuống (có hiệu ứng rơi); false khi vào giữa trận và nó đã nằm sẵn đó.
function addPickup(m, fall = false) {
  if (!pickups.has(m.id)) pickups.set(m.id, createPickup(m, { fall, onLand: landEffects }));
}

function clearPickups() {
  for (const pickup of pickups.values()) disposePickup(pickup);
  pickups.clear();
}

// Đồng hồ của server gửi dạng "còn bao nhiêu ms"; đổi sang mốc của đồng hồ máy mình.
function applyMatch({ phase, timeLeft, wave, ranking }) {
  const now = performance.now();
  state.match.phase = phase;
  state.match.endsAt = now + timeLeft;
  state.match.wave = wave ? { at: now + wave.in, count: wave.count } : null;
  state.match.ranking = ranking;
}

const messageHandlers = {
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
    m.pickups.forEach((p) => addPickup(p));
    applyMatch(m.match);
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
    state.match.wave = null;
  },

  // Về phòng chờ: sau khi hết giờ nghỉ, hoặc đếm ngược bị huỷ (có người bỏ sẵn sàng / vào thêm / thoát).
  lobby(m) {
    state.match.phase = 'lobby';
    state.match.wave = null;
    if (!m.cancelled) {
      clearPickups();
      state.match.ranking = [];
    }
    announce(m.cancelled ? 'Đã huỷ đếm ngược' : 'Về phòng chờ. Bấm F khi sẵn sàng');
  },

  // Báo trước một đợt vũ khí: hiện đếm ngược cho mọi người.
  wave(m) {
    state.match.wave = { at: performance.now() + m.in, count: m.count };
    Sfx.warning();
  },

  drop(m) {
    state.match.wave = null;
    Sfx.drop();
    announce('VŨ KHÍ ĐÃ RƠI!');
    m.pickups.forEach((p) => addPickup(p, true));
  },

  pickup(m) {
    const pickup = pickups.get(m.id);
    if (pickup) {
      if (m.by === state.myId) Sfx.pickup(0, 1);
      else playAt('pickup', pickup.root.position);
      disposePickup(pickup);
    }
    pickups.delete(m.id);
  },

  start(m) {
    clearPickups();
    state.match.phase = 'playing';
    state.match.endsAt = performance.now() + m.duration;
    state.match.wave = null;
    state.match.ranking = [];
    Sfx.horn();
    announce('TRẬN MỚI BẮT ĐẦU!');
  },

  end(m) {
    state.match.phase = 'ended';
    state.match.endsAt = performance.now() + m.intermission;
    state.match.wave = null;
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

  punch(m) {
    const r = remotes.get(m.id);
    if (m.id === state.myId || !r) return;
    r.fists[m.hand].punch((state.weaponTypes[r.weapon]?.cooldown ?? 350) / 1000); // đòn nhanh thì hoạt ảnh tua nhanh theo
    playAt(WEAPON_MODELS[r.weapon]?.swingSound ?? 'whoosh', r.root.position);
  },

  hit(m) {
    playAt('impact', positionOf(m.id));
    if (m.id === state.myId) {
      state.shake = Math.max(state.shake, 0.12);
      flashDamage();
      return;
    }
    const target = remotes.get(m.id);
    const attacker = positionOf(m.by);
    if (target && attacker) spawnHitEffects(target, attacker, m.dmg);
    if (m.by === state.myId) {
      state.shake = Math.max(state.shake, 0.04);
      flashCrosshairHit();
    }
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

function syncLocalPlayer(p) {
  if (state.alive && p.dead) Sfx.ko(0, 1);
  state.hp = p.hp;
  state.alive = !p.dead;
  state.weapon = p.w; // player/localPlayer.js tự đổi vũ khí cầm trên tay khi thấy giá trị này đổi
  // Tạm thời server mới cho cầm một vũ khí nên nó nằm ở ô 1. Khi server có túi đồ nhiều ô thì lấy từ đó.
  state.inventory[0] = p.w === 'fist' ? null : p.w;
}

function syncRemote(p) {
  let r = remotes.get(p.id);
  if (!r) {
    const info = infos.get(p.id);
    if (!info) return;
    r = createRemote(p.id, info);
    remotes.set(p.id, r);
  }
  r.tx = p.x;
  r.ty = p.y;
  r.tz = p.z;
  r.tc = p.c;
  r.tyaw = p.yaw;
  r.hp = p.hp;
  if (!r.dead && p.dead) {
    playAt('ko', r.root.position);
    r.knockOut();
  } else if (r.dead && !p.dead) {
    r.resetAnimation(); // hồi sinh: về tư thế đứng ở chỗ mới
    r.root.position.set(p.x, p.y, p.z); // đặt thẳng tới chỗ hồi sinh, không trượt từ chỗ chết
  }
  r.dead = p.dead;
  if (p.w !== r.weapon) {
    r.weapon = p.w;
    equipLoadout(r.fists, p.w);
  }
  if (!r.initialised) {
    r.root.position.set(p.x, p.y, p.z);
    r.root.rotation.y = p.yaw;
    r.initialised = true;
  }
}

function applySnapshot(list) {
  state.readyIds = new Set(list.filter((p) => p.r).map((p) => p.id));
  state.ready = state.readyIds.has(state.myId);
  const seen = new Set();
  for (const p of list) {
    seen.add(p.id);
    if (p.id === state.myId) syncLocalPlayer(p);
    else syncRemote(p);
  }
  for (const [id, r] of remotes) {
    if (!seen.has(id)) {
      disposeRemote(r);
      remotes.delete(id);
    }
  }
  updateHud(list);
}
