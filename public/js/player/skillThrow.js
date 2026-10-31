import { state } from '../state.js';
import { actionBlocked } from '../core/freeze.js';
import { send } from '../net/socket.js';
import { swingHand } from './viewmodel.js';
import * as Sfx from '../audio/sfx.js';
import { SKILL_THROW, FIST_SLOT } from '../config.js';

// Skill ném vũ khí: giữ chuột phải để ngắm (fx/skillPreview.js vẽ đường bay, tay giơ lên), bấm chuột trái lúc đang ngắm thì ném; vũ khí mất luôn.
// Thả chuột phải thì huỷ ngắm. Chỉ vũ khí có `throwSkill` trong state.weaponTypes (server gửi trong welcome). Server quyết định đường bay và
// sát thương (server/game/skillThrow.js), vũ khí bay hiện ra khi có tin 'skillthrow'.

const skillOf = () => state.weaponTypes[state.weapon]?.throwSkill ?? null;

const canAim = () => state.alive && !actionBlocked() && state.match.phase === 'playing' && !state.reloading && skillOf() !== null
  && !(state.event?.kind === 'tnt' && state.event.targetId === state.myId);

// Chuột phải được nhấn: bắt đầu ngắm nếu vũ khí đang cầm có skill. Trả về true nếu đã nhận (chuột phải không làm gì khác).
export function startSkillAim() {
  if (!canAim()) return false;
  state.skillAim = true;
  return true;
}

export function stopSkillAim() {
  state.skillAim = false;
}

// Chuột trái lúc đang ngắm: ném vũ khí đi. Đang hồi chiêu thì chưa ném, vẫn giữ ngắm. Trả về true nếu đã ném.
export function throwWeapon() {
  if (!state.skillAim || state.cooldown > 0 || !canAim()) return false;
  send({ t: 'skillthrow', yaw: state.yaw, pitch: state.pitch });
  swingHand('L', SKILL_THROW.lockoutSeconds);
  Sfx.at('whoosh', 0, 0, 0, 0, 0);
  state.cooldown = SKILL_THROW.lockoutSeconds;
  // Vũ khí rời túi ngay trên máy mình (server làm y hệt trong takeActive), không đợi snapshot.
  state.inventory[state.activeSlot] = null;
  state.activeSlot = FIST_SLOT;
  state.weapon = 'fist';
  state.ammo = null;
  state.slotChangedAt = performance.now();
  state.skillAim = false;
  return true;
}

// Gọi mỗi khung hình: đang ngắm mà không còn ngắm được (đổi vũ khí, bị choáng, hết trận, mất khoá chuột...) thì huỷ.
export function updateSkillThrow() {
  if (state.skillAim && (!canAim() || !document.pointerLockElement)) state.skillAim = false;
}
