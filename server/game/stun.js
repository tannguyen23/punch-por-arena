const { LIGHTNING } = require('../config');
const { broadcast, send } = require('../net/messaging');

function stunPlayer(room, p, now) {
  if (p.dead) return;
  p.stunnedUntil = now + LIGHTNING.stunMs;
  p.sprinting = false;
  send(p.ws, { t: 'setpos', x: p.x, y: p.y, z: p.z });
  if (p.bigChargeAt) {
    p.bigChargeAt = 0;
    broadcast(room, { t: 'bigcancel', id: p.id });
  }
  broadcast(room, { t: 'stun', id: p.id, ms: LIGHTNING.stunMs });
}

function clearStuns(room) {
  for (const p of room.players.values()) p.stunnedUntil = 0;
}

module.exports = { stunPlayer, clearStuns };
