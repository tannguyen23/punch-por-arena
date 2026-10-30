const { WEAPONS } = require('./weapons');
const { cantAct } = require('./restrictions');
const { send } = require('../net/messaging');

// ammo vẫn là tổng đạn để vứt / chết / cộng dồn không tạo hoặc làm mất đạn.
function prepareMagazine(slot) {
  const capacity = WEAPONS[slot.weapon].magazineSize;
  if (capacity && slot.magazine === undefined) slot.magazine = Math.min(capacity, slot.ammo);
  return slot;
}

function cancelReload(p) {
  p.reload = null;
}

function updateReload(room, p, now = Date.now()) {
  const reload = p.reload;
  if (!reload) return;
  if (p.dead || room.phase !== 'playing' || cantAct(room, p) || p.slots[p.activeSlot] !== reload.slot) return cancelReload(p);
  if (now < reload.endsAt) return;
  reload.slot.magazine = Math.min(WEAPONS[reload.slot.weapon].magazineSize, reload.slot.ammo);
  p.magazine = reload.slot.magazine;
  cancelReload(p);
}

function handleReload(room, p) {
  updateReload(room, p);
  const slot = p.slots[p.activeSlot];
  const weapon = slot && WEAPONS[slot.weapon];
  if (room.phase !== 'playing' || p.dead || cantAct(room, p) || !weapon?.magazineSize) {
    return send(p.ws, { t: 'reloaderror', reason: 'unavailable' });
  }
  prepareMagazine(slot);
  if (p.reload) return;
  if (slot.magazine >= weapon.magazineSize) return send(p.ws, { t: 'reloaderror', reason: 'full' });
  if (slot.ammo <= slot.magazine) return send(p.ws, { t: 'reloaderror', reason: 'empty' });
  p.reload = { slot, endsAt: Date.now() + weapon.reloadMs };
  send(p.ws, { t: 'reloading', weapon: slot.weapon, ms: weapon.reloadMs });
}

module.exports = { prepareMagazine, cancelReload, updateReload, handleReload };
