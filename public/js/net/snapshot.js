import { state, remotes, infos } from '../state.js';
import { createRemote, disposeRemote } from '../entities/remotePlayer.js';
import { equipLoadout, thirdPersonTilt } from '../entities/weapons/index.js';
import { setDogForm } from '../entities/dogForm.js';
import { potionChanged } from '../fx/potionFx.js';
import { updateHud } from '../ui/hud.js';
import { AMMO_SYNC_GRACE_MS, SLOT_SYNC_GRACE_MS, REMOTE_SNAP_DIST } from '../config.js';
import { playAt } from './positional.js';
import * as Sfx from '../audio/sfx.js';

// Vũ khí đang cầm và ô đang chọn. Vừa bấm đổi ô (player/inventory.js) thì snapshot có thể còn là ô cũ: đợi một lúc.
function syncHeld(p) {
  const now = performance.now();
  if (state.event?.kind === 'tnt' && state.event.targetId === state.myId) {
    state.weapon = 'fist';
    state.ammo = null;
    state.magazine = null;
    state.reloading = false;
    state.activeSlot = p.as;
    return;
  }
  if (now - state.slotChangedAt < SLOT_SYNC_GRACE_MS) return;
  // Đạn trừ ngay khi bắn (player/attack.js); snapshot tới chậm hơn nên chỉ ghi đè khi đổi vũ khí hoặc đã ngừng bắn một lúc.
  if (p.w !== state.weapon || p.rl > 0 || state.reloading || now - state.lastFireAt > AMMO_SYNC_GRACE_MS) {
    state.ammo = p.a;
    state.magazine = p.mg ?? null;
  }
  state.reloading = p.rl > 0;
  state.reloadEndsAt = p.rl > 0 ? now + p.rl : 0;
  state.weapon = p.w; // player/viewmodel.js tự đổi vũ khí cầm trên tay khi thấy giá trị này đổi
  state.activeSlot = p.as;
}

function syncLocalPlayer(p) {
  if (state.alive && p.dead) Sfx.ko(0, 1);
  state.hp = p.hp;
  state.maxHp = p.mh;
  if ((p.pt || 0) !== (state.potion?.id ?? 0)) potionChanged(state.potion?.id ?? 0, p.pt || 0); // uống / hết thuốc: loé màn hình, tiếng
  state.potion = p.pt ? { id: p.pt, endsAt: performance.now() + p.pl } : null; // server gửi "còn bao lâu", đổi sang đồng hồ máy mình
  state.streak = p.ks;
  state.alive = !p.dead;
  state.stunnedUntil = performance.now() + (p.st ?? 0);
  state.dog = p.dg === 1;
  state.poopCharges = p.pc;
  state.poopNextAt = p.pn ? performance.now() + p.pn : 0;
  state.inventory = p.s.map((s) => (s ? { weapon: s[0], ammo: s[1], magazine: s[2] ?? null } : null));
  syncHeld(p);
}

function syncRemote(p) {
  let r = remotes.get(p.id);
  if (!r) {
    const info = infos.get(p.id);
    if (!info) return;
    r = createRemote(p.id, info);
    remotes.set(p.id, r);
  }
  if (r.initialised && Math.hypot(p.x - r.tx, p.z - r.tz) > REMOTE_SNAP_DIST) r.root.position.set(p.x, p.y, p.z);
  r.tx = p.x;
  r.ty = p.y;
  r.tz = p.z;
  r.tc = p.c;
  r.sprinting = p.sp === 1;
  r.stunnedUntil = performance.now() + (p.st ?? 0);
  r.tyaw = p.yaw;
  r.hp = p.hp;
  r.maxHp = p.mh;
  r.potion = p.pt;
  setDogForm(r, p.dg === 1);
  if (!r.dead && p.dead) {
    playAt('ko', r.root.position);
    r.knockOut();
  } else if (r.dead && !p.dead) {
    r.resetAnimation(); // hồi sinh: về tư thế đứng ở chỗ mới
    r.root.position.set(p.x, p.y, p.z); // đặt thẳng tới chỗ hồi sinh, không trượt từ chỗ chết
  }
  r.dead = p.dead;
  const visual = state.event?.kind === 'tnt' && state.event.targetId === p.id ? 'tnt' : p.w;
  r.weapon = p.w;
  if (visual !== r.visualWeapon) {
    r.visualWeapon = visual;
    equipLoadout(r.fists, visual, thirdPersonTilt(visual)); // súng chĩa ra trước, vũ khí cận chiến theo cẳng tay
  }
  if (!r.initialised) {
    r.root.position.set(p.x, p.y, p.z);
    r.root.rotation.y = p.yaw;
    r.initialised = true;
  }
}

export function applySnapshot(list) {
  state.roster = list;
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
