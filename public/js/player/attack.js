import { state } from '../state.js';
import { send } from '../net/socket.js';
import { WEAPON_MODELS } from '../entities/weapons/index.js';
import { muzzleFlash } from '../fx/gunEffects.js';
import { swingHand } from './viewmodel.js';
import { muzzlePosition } from './aim.js';
import { announce } from '../ui/matchHud.js';
import * as Sfx from '../audio/sfx.js';
import { PUNCH_COOLDOWN, PITCH_LIMIT, FIST_SLOT } from '../config.js';

const DRY_FIRE_COOLDOWN = 0.3; // giây giữa hai tiếng "cạch" khi bóp cò lúc hết đạn
const DROP_HINT = 'BẤM G ĐỂ VỨT';

const kindOf = (id) => state.weaponTypes[id]?.kind ?? 'melee';
const cooldownOf = (id) => (state.weaponTypes[id]?.cooldown ?? PUNCH_COOLDOWN * 1000) / 1000;

// Tay sẽ đấm tiếp theo khi giữ chuột với vũ khí tự đánh (luân phiên trái/phải).
let autoButton = 0;

const emptyText = () => (kindOf(state.weapon) === 'melee' ? 'VŨ KHÍ ĐÃ GÃY!' : 'HẾT ĐẠN!');

// Trừ đạn ngay trên màn hình, không đợi snapshot (xem AMMO_SYNC_GRACE_MS). Hết đạn thì vũ khí vẫn nằm trong ô
// cho tới khi người chơi tự vứt.
function spendAmmo() {
  if (state.ammo === null) return;
  state.ammo = Math.max(0, state.ammo - 1);
  state.lastFireAt = performance.now();
  if (state.ammo === 0) announce(`${emptyText()} ${DROP_HINT}`);
}

// Đánh / bắn bằng vũ khí đã hết đạn: súng kêu "cạch", dao gãy thì nhắc vứt đi.
function dryAttack() {
  state.cooldown = DRY_FIRE_COOLDOWN;
  if (kindOf(state.weapon) === 'melee') announce(`${emptyText()} ${DROP_HINT}`);
  else Sfx.dryFire();
}

// Vũ khí cận chiến (tay không, dao...): vung tay, server tìm người trúng. Dao mất một độ bền mỗi lần chém.
function punch(button) {
  const hand = button === 0 ? 'L' : 'R';
  const cooldown = cooldownOf(state.weapon);
  state.cooldown = cooldown;
  state.fovKick = 0.07 * Math.min(1, cooldown / PUNCH_COOLDOWN); // đấm càng nhanh càng giật nhẹ
  swingHand(hand, cooldown);
  Sfx.at(WEAPON_MODELS[state.weapon]?.swingSound ?? 'whoosh', 0, 0, 0, 0, 0);
  send({ t: 'punch', hand });
  spendAmmo();
  autoButton = button === 0 ? 2 : 0;
}

// Súng / tên lửa: lửa đầu nòng, tiếng nổ và độ giật hiện ngay; vệt đạn, tên lửa và sát thương do server báo về.
function fire() {
  const def = WEAPON_MODELS[state.weapon];
  state.cooldown = cooldownOf(state.weapon);
  send({ t: 'fire', yaw: state.yaw, pitch: state.pitch });
  spendAmmo();
  const muzzle = muzzlePosition();
  muzzleFlash(muzzle.x, muzzle.y, muzzle.z, 0.3, true);
  Sfx.at(def?.shotSound ?? 'pistolShot', 0, 0, 0, 0, 0);
  state.recoil = 1;
  state.pitch = Math.max(-PITCH_LIMIT, state.pitch - (def?.recoil ?? 0.02)); // nòng hếch lên
}

// Lựu đạn: chuột trái ném mạnh, chuột phải tung nhẹ; server mô phỏng đường bay. Ném quả cuối thì ô trống và về tay không
// ngay trên máy mình (server làm y hệt trong useAmmo), không nhắc "bấm G" như vũ khí hết đạn.
function throwGrenade(button) {
  state.cooldown = cooldownOf(state.weapon);
  swingHand('R', state.cooldown);
  Sfx.at('whoosh', 0, 0, 0, 0, 0);
  send({ t: 'throw', yaw: state.yaw, pitch: state.pitch, soft: button === 2 });
  state.ammo = Math.max(0, state.ammo - 1);
  state.lastFireAt = performance.now();
  if (state.ammo > 0) return;
  state.inventory[state.activeSlot] = null;
  state.activeSlot = FIST_SLOT;
  state.weapon = 'fist';
  state.ammo = null;
  state.slotChangedAt = performance.now();
}

// button: 0 = chuột trái, 2 = chuột phải. Cận chiến: tay trái / tay phải; súng: nút nào cũng bắn; lựu đạn: ném mạnh / nhẹ. Trả về true nếu đã đánh.
export function attack(button) {
  if (!state.alive || state.cooldown > 0 || state.match.phase !== 'playing') return false;
  if (button !== 0 && button !== 2) return false;
  if (state.ammo === 0) dryAttack();
  else if (kindOf(state.weapon) === 'melee') punch(button);
  else if (kindOf(state.weapon) === 'throwable') throwGrenade(button);
  else fire();
  return true;
}

// Giữ chuột với vũ khí tự đánh (găng sấm sét, AK): đánh / bắn liên tục theo tốc độ của vũ khí.
export function updateAttack() {
  if (state.attacking && WEAPON_MODELS[state.weapon]?.autoFire) attack(autoButton);
}
