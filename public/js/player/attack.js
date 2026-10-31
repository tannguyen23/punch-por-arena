import { state } from '../state.js';
import { send } from '../net/socket.js';
import { WEAPON_MODELS } from '../entities/weapons/index.js';
import { muzzleFlash } from '../fx/gunEffects.js';
import { swingHand } from './viewmodel.js';
import { startSkillAim, throwWeapon } from './skillThrow.js';
import { startGrenadeAim } from './grenadeAim.js';
import { breakHeldWeapon } from './inventory.js';
import { muzzlePosition } from './aim.js';
import { announce } from '../ui/matchHud.js';
import { nukeActive } from '../fx/nuke.js';
import { actionBlocked } from '../core/freeze.js';
import * as Sfx from '../audio/sfx.js';
import { PUNCH_COOLDOWN, PITCH_LIMIT } from '../config.js';

const DRY_FIRE_COOLDOWN = 0.3; // giây giữa hai tiếng "cạch" khi bóp cò lúc hết băng (còn đạn dự trữ)

const kindOf = (id) => state.weaponTypes[id]?.kind ?? 'melee';
const cooldownOf = (id) => (state.weaponTypes[id]?.cooldown ?? PUNCH_COOLDOWN * 1000) / 1000;

// Tay không đấm luân phiên trái / phải mỗi đòn (cả khi bấm lẻ lẫn khi giữ chuột). Cầm vũ khí thì mọi đòn đánh bằng tay phải
// (tay cầm vũ khí), để đòn nào cũng là đòn của vũ khí. Bắt đầu bằng tay phải.
let nextHand = 'R';

const breakText = () => {
  const kind = kindOf(state.weapon);
  if (kind === 'melee') return 'VŨ KHÍ ĐÃ GÃY!';
  if (kind === 'nuke') return 'RADIO ĐÃ DÙNG HẾT!';
  return 'HẾT ĐẠN! VŨ KHÍ ĐÃ HỎNG';
};

// Trừ đạn ngay trên màn hình, không đợi snapshot (xem AMMO_SYNC_GRACE_MS). Hết đạn / độ bền thì vũ khí hỏng,
// ô đồ trống và về tay không ngay (server làm y hệt trong useAmmo).
function spendAmmo() {
  if (state.ammo === null) return;
  state.ammo = Math.max(0, state.ammo - 1);
  if (state.weaponTypes[state.weapon]?.magazineSize) state.magazine = Math.max(0, state.magazine - 1);
  state.lastFireAt = performance.now();
  if (state.ammo === 0) {
    announce(breakText());
    breakHeldWeapon();
    return;
  }
  if (state.magazine === 0 && state.weaponTypes[state.weapon]?.magazineSize) announce('HẾT BĂNG! BẤM R ĐỂ THAY BĂNG');
}

// Bóp cò lúc hết băng: còn đạn dự trữ thì kêu "cạch" và nhắc thay băng; hết sạch thì vũ khí hỏng, biến mất.
function dryAttack() {
  state.cooldown = DRY_FIRE_COOLDOWN;
  if (state.ammo === 0) {
    announce(breakText());
    breakHeldWeapon();
    return;
  }
  Sfx.dryFire();
  if (state.weaponTypes[state.weapon]?.magazineSize) announce('HẾT BĂNG! BẤM R ĐỂ THAY BĂNG');
}

// Vũ khí cận chiến (tay không, dao...): vung tay, server tìm người trúng. Dao mất một độ bền mỗi lần chém.
function punch() {
  const bareHands = state.weapon === 'fist';
  const hand = bareHands ? nextHand : 'R';
  if (bareHands) nextHand = hand === 'L' ? 'R' : 'L';
  const cooldown = cooldownOf(state.weapon);
  state.cooldown = cooldown;
  state.fovKick = 0.07 * Math.min(1, cooldown / PUNCH_COOLDOWN); // đấm càng nhanh càng giật nhẹ
  swingHand(hand, cooldown);
  Sfx.at(WEAPON_MODELS[state.weapon]?.swingSound ?? 'whoosh', 0, 0, 0, 0, 0);
  send({ t: 'punch', hand });
  spendAmmo();
}

// Súng / tên lửa (chuột trái): lửa đầu nòng, tiếng nổ và độ giật hiện ngay; vệt đạn, tên lửa và sát thương do server báo về.
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

// Radio gọi bom hạt nhân: dùng một lần, mọi thứ sau đó (radio, còi, máy bay, bom) do server báo về ('nuke', 'nukeboom').
function callNuke() {
  if (nukeActive()) {
    announce('ĐÃ CÓ BOM ĐANG TỚI!');
    return;
  }
  state.cooldown = cooldownOf(state.weapon);
  send({ t: 'fire', yaw: state.yaw, pitch: state.pitch });
  spendAmmo();
}

// Chuột phải (input.js gọi, không phải đòn đánh): bắt đầu ngắm skill ném vũ khí nếu vũ khí đang cầm có; lựu đạn thì ngắm tung nhẹ; còn lại không làm gì.
export function secondaryButton() {
  if (startSkillAim()) return;
  if (kindOf(state.weapon) === 'throwable') attack(2);
}

// button: 0 = chuột trái (đánh / bắn / ném / gọi radio), 2 = chuột phải chỉ để ngắm tung nhẹ lựu đạn (xem secondaryButton). Đang ngắm skill ném vũ khí thì chuột trái là ném, không đánh thường. Trả về true nếu đã đánh.
export function attack(button) {
  if (!state.alive || state.cooldown > 0 || state.match.phase !== 'playing') return false;
  if (state.bigPunch.charging) return false; // đang tích lực đấm lớn: tay đang giữ tư thế lấy đà
  if (actionBlocked()) return false; // chó chỉ chạy; đứng hình thì không ai đánh được; sự kiện solo chỉ hai võ sĩ trong hiệp mới đánh
  if (state.reloading) return false;
  if (button !== 0 && button !== 2) return false;
  if (state.skillAim) return button === 0 && throwWeapon();
  const kind = kindOf(state.weapon);
  if (state.ammo === 0 || (state.weaponTypes[state.weapon]?.magazineSize && !(state.magazine > 0))) dryAttack();
  else if (kind === 'melee') punch();
  else if (kind === 'throwable') startGrenadeAim(button); // giữ chuột để ngắm, thả chuột mới ném (grenadeAim.js)
  else if (kind === 'nuke') callNuke();
  else fire();
  return true;
}

// Giữ chuột với vũ khí tự đánh (găng sấm sét, AK): đánh / bắn liên tục theo tốc độ của vũ khí.
export function updateAttack() {
  if (state.attacking && WEAPON_MODELS[state.weapon]?.autoFire) attack(0);
}
