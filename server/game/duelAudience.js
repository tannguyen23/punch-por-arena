const { DUEL_AUDIENCE, WALL_HEIGHT, TERRAIN_RAY_STEP, EYE_HEIGHT, CROUCH_EYE_HEIGHT } = require('../config');
const { isFrozen, isStunned } = require('./restrictions');
const { planThrow, inRing, tomatoTarget } = require('./duelThrow');
const { broadcast, send } = require('../net/messaging');
const { pickupView } = require('./pickupView');

const freshKit = () => ({ knives: DUEL_AUDIENCE.knives, tomatoes: DUEL_AUDIENCE.tomatoes, nextAt: 0 });
const getKit = (ev, id) => {
  if (!ev.audience.kits.has(id)) ev.audience.kits.set(id, freshKit());
  return ev.audience.kits.get(id);
};

function createAudience() {
  return { kits: new Map(), flights: new Map(), nextId: 1 };
}

function audienceView(room, ev, now) {
  if (!ev.audience) return null;
  return {
    rules: { ...DUEL_AUDIENCE, wallHeight: WALL_HEIGHT, terrainRayStep: TERRAIN_RAY_STEP, eyeHeight: EYE_HEIGHT, crouchEyeHeight: CROUCH_EYE_HEIGHT },
    blockers: room.punchBlockers,
    kits: [...room.players.keys()].filter((id) => !ev.fighters.includes(id)).map((id) => {
      const kit = ev.audience.kits.get(id) ?? freshKit();
      return { id, knives: kit.knives, tomatoes: kit.tomatoes, wait: Math.max(0, kit.nextAt - now) };
    }),
    flights: [...ev.audience.flights.values()].map(({ checked, startedAt, ...flight }) => ({ ...flight, age: now - startedAt })),
  };
}

function announce(room, ev) {
  broadcast(room, { t: 'duelaudience', audience: audienceView(room, ev, Date.now()) });
}

const reject = (p, reason) => send(p.ws, { t: 'duelaudienceerror', reason });

function handleAudienceThrow(room, p, m) {
  const ev = room.event;
  if (room.phase !== 'playing' || ev?.kind !== 'duel' || ev.stage !== 'fight' || !ev.fighting || !ev.audience
    || ev.fighters.includes(p.id) || room.players.get(p.id) !== p || p.dead || p.dog
    || p.tableId != null || isFrozen(room) || isStunned(p)) return reject(p, 'unavailable');
  if (!['knife', 'tomato'].includes(m.kind) || !Number.isFinite(m.yaw) || !Number.isFinite(m.pitch)
    || Math.abs(m.pitch) > Math.PI / 2 || Math.abs(m.yaw) > DUEL_AUDIENCE.maxYaw) return reject(p, 'bad_aim');
  const now = Date.now();
  const kit = getKit(ev, p.id);
  const key = m.kind === 'knife' ? 'knives' : 'tomatoes';
  if (now < kit.nextAt) return reject(p, 'cooldown');
  if (!kit[key]) return reject(p, 'empty');
  const flight = planThrow(room, p, m.yaw, m.pitch);
  if (m.kind === 'knife' && (!flight.landed || !inRing(room, flight.landing))) return reject(p, 'outside');
  kit[key]--;
  kit.nextAt = now + DUEL_AUDIENCE.gapMs;
  const id = ev.audience.nextId++;
  ev.audience.flights.set(id, { ...flight, id, kind: m.kind, startedAt: now, checked: 0 });
  announce(room, ev);
}

function landKnife(room, flight) {
  const now = Date.now();
  const pickup = {
    id: room.nextPickupId++, weapon: 'knife', ammo: DUEL_AUDIENCE.knifeAmmo,
    ...flight.landing, heading: 0, releaseAt: now, landsAt: now, dropped: true, duelLoot: true,
  };
  room.pickups.set(pickup.id, pickup);
  broadcast(room, { t: 'drop', by: null, pickup: pickupView(pickup, now) });
}

function tickAudience(room, ev, now) {
  if (!ev.audience || !ev.fighting) return;
  let changed = false;
  for (const [id, flight] of ev.audience.flights) {
    const elapsed = now - flight.startedAt;
    const hit = flight.kind === 'tomato' ? tomatoTarget(room, ev, flight, elapsed) : null;
    if (!hit && elapsed < flight.duration) continue;
    if (flight.kind === 'knife') landKnife(room, flight);
    if (hit) broadcast(room, { t: 'dueltomatohit', id: hit.id, at: hit.at, ms: DUEL_AUDIENCE.splatMs });
    ev.audience.flights.delete(id);
    changed = true;
  }
  if (changed) announce(room, ev);
}

function clearAudience(room, ev) {
  ev.audience?.flights.clear();
  const ids = [];
  for (const [id, pickup] of room.pickups) {
    if (!pickup.duelLoot) continue;
    room.pickups.delete(id);
    ids.push(id);
  }
  broadcast(room, { t: 'duelaudienceclear', ids });
}

module.exports = { createAudience, audienceView, handleAudienceThrow, tickAudience, clearAudience };
