const { broadcast } = require('../net/messaging');
const { isPlaying } = require('./match');
const { takeActive } = require('./inventory');
const { cantAct } = require('./restrictions');
const { pickupView } = require('./pickups');

// Phím G: vứt vũ khí đang cầm xuống chân, về tay không. Còn đạn thì nằm lại trên sân cho người khác nhặt;
// hết đạn / dao gãy thì vứt luôn (không ai cần nhặt vũ khí rỗng).
function handleDrop(room, p) {
  if (!isPlaying(room) || p.dead || cantAct(room, p)) return;
  const slot = takeActive(p);
  if (!slot || slot.ammo === 0) return;
  const now = Date.now();
  const pickup = {
    id: room.nextPickupId++,
    weapon: slot.weapon,
    ammo: slot.ammo,
    x: +p.x.toFixed(2),
    z: +p.z.toFixed(2),
    y: +room.terrain.heightAt(p.x, p.z).toFixed(2),
    heading: 0,
    releaseAt: now,
    landsAt: now,
    dropped: true,
    ignore: p.id, // đang đứng trên nó, không tự nhặt lại ngay (xem tryPickup)
  };
  room.pickups.set(pickup.id, pickup);
  broadcast(room, { t: 'drop', by: p.id, pickup: pickupView(pickup, now) });
}

module.exports = { handleDrop };
