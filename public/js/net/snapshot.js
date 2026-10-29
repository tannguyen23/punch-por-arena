import { state, remotes, infos } from '../state.js';
import { createRemote, disposeRemote } from '../entities/remotePlayer.js';
import { equipLoadout, thirdPersonTilt } from '../entities/weapons/index.js';
import { updateHud } from '../ui/hud.js';
import { announce } from '../ui/matchHud.js';
import { AMMO_SYNC_GRACE_MS } from '../config.js';
import { playAt } from './positional.js';
import * as Sfx from '../audio/sfx.js';

// Vũ khí vừa hết đạn / dao vừa gãy (server tự đổi về tay không): báo cho người chơi biết vì sao mất vũ khí.
function announceEmpty(prevWeapon, prevAmmo, p) {
  if (p.dead || p.w !== 'fist' || prevWeapon === 'fist' || prevAmmo === null || prevAmmo > 1) return;
  announce(state.weaponTypes[prevWeapon]?.kind === 'melee' ? 'VŨ KHÍ ĐÃ GÃY!' : 'HẾT ĐẠN!');
}

function syncLocalPlayer(p) {
  if (state.alive && p.dead) Sfx.ko(0, 1);
  announceEmpty(state.weapon, state.ammo, p);
  // Đạn trừ ngay khi bắn (player/attack.js); snapshot tới chậm hơn nên chỉ ghi đè khi đổi vũ khí hoặc đã ngừng bắn một lúc.
  if (p.w !== state.weapon || performance.now() - state.lastFireAt > AMMO_SYNC_GRACE_MS) state.ammo = p.a;
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
  if (!r.dead && p.dead) playAt('ko', r.root.position);
  r.dead = p.dead;
  if (p.w !== r.weapon) {
    r.weapon = p.w;
    equipLoadout(r.fists, p.w, thirdPersonTilt(p.w)); // súng chĩa ra trước, vũ khí cận chiến theo cẳng tay
  }
  if (!r.initialised) {
    r.root.position.set(p.x, p.y, p.z);
    r.root.rotation.y = p.yaw;
    r.initialised = true;
  }
}

export function applySnapshot(list) {
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
