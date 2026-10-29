const {
  CACTUS_DAMAGE,
  CACTUS_DAMAGE_COOLDOWN_MS,
  CACTUS_CONTACT_TOLERANCE,
  PLAYER_RADIUS,
} = require('../config');
const { applyDamage } = require('./damage');

function checkHazardContact(room, p, now = Date.now()) {
  if (room.phase !== 'playing' || p.dead || now - p.lastCactusDamageAt < CACTUS_DAMAGE_COOLDOWN_MS) return;

  const touchingSpikes = room.mapData.props.some((prop) =>
    prop.hazard === 'spikes'
    && Math.hypot(prop.x - p.x, prop.z - p.z) <= prop.r + PLAYER_RADIUS + CACTUS_CONTACT_TOLERANCE);
  if (!touchingSpikes) return;

  p.lastCactusDamageAt = now;
  applyDamage(room, null, p, CACTUS_DAMAGE, 'cactus');
}

module.exports = { checkHazardContact };
