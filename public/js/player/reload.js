import { state } from '../state.js';
import { actionBlocked } from '../core/freeze.js';
import { send } from '../net/socket.js';
import { announce } from '../ui/matchHud.js';

export function reloadWeapon() {
  const weapon = state.weaponTypes[state.weapon];
  if (!weapon?.magazineSize || !state.alive || state.match.phase !== 'playing' || actionBlocked()) return;
  if (state.reloading) return;
  if (state.magazine >= weapon.magazineSize) return announce('BĂNG ĐẠN ĐÃ ĐẦY');
  if (state.ammo <= state.magazine) return announce('HẾT ĐẠN DỰ TRỮ');
  send({ t: 'reload' });
}
