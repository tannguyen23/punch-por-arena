import { state } from '../state.js';
import { send } from '../net/socket.js';
import { actionBlocked } from '../core/freeze.js';
import { swingHand } from './viewmodel.js';
import * as Sfx from '../audio/sfx.js';
import { breakHeldWeapon } from './inventory.js';

// Ném lựu đạn kiểu giữ-để-ngắm: giữ chuột trái (ném xa) hoặc chuột phải (tung nhẹ) thì fx/grenadePreview.js vẽ đường bay tới chỗ chạm đất đầu tiên
// (không tính nảy / lăn), thả chuột thì ném. Mất khoá chuột, đổi vũ khí, bị choáng... thì huỷ ngắm, không ném. Server mô phỏng đường bay thật
// (server/game/grenades.js), vị trí các quả đi trong snapshot.

const grenade = () => state.weaponTypes[state.weapon]?.grenade ?? null;

const canAim = () => state.alive && !actionBlocked() && state.match.phase === 'playing' && !state.reloading && grenade() !== null && state.ammo > 0
  && !state.bigPunch.charging && !(state.event?.kind === 'tnt' && state.event.targetId === state.myId);

// Chuột được nhấn (attack.js gọi): bắt đầu ngắm. button 2 = chuột phải = tung nhẹ.
export function startGrenadeAim(button) {
  state.grenadeAim = { soft: button === 2 };
}

export function cancelGrenadeAim() {
  state.grenadeAim = null;
}

// Chuột được thả: ném nếu đang ngắm bằng đúng nút đó và vẫn ném được. Quả cuối thì ô trống và về tay không ngay trên máy mình
// (server làm y hệt trong useAmmo).
export function releaseGrenadeAim(button) {
  const aim = state.grenadeAim;
  if (!aim || aim.soft !== (button === 2)) return;
  state.grenadeAim = null;
  if (!canAim() || state.cooldown > 0) return;
  state.cooldown = (state.weaponTypes[state.weapon].cooldown ?? 900) / 1000;
  swingHand('R', state.cooldown);
  Sfx.at('whoosh', 0, 0, 0, 0, 0);
  send({ t: 'throw', yaw: state.yaw, pitch: state.pitch, soft: aim.soft });
  state.ammo = Math.max(0, state.ammo - 1);
  state.lastFireAt = performance.now();
  if (state.ammo === 0) breakHeldWeapon();
}

// Gọi mỗi khung hình: đang ngắm mà không còn ngắm được thì huỷ.
export function updateGrenadeAim() {
  if (state.grenadeAim && (!canAim() || !document.pointerLockElement)) state.grenadeAim = null;
}
