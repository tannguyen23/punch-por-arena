const { TNT_EVENT } = require('../config');
const { broadcast } = require('../net/messaging');
const { selectSlot, FIST_SLOT } = require('./inventory');

const alivePlayers = (room) => [...room.players.values()].filter((p) => !p.dead && !p.dog);
const pick = (players) => players[Math.floor(Math.random() * players.length)];

function assign(room, ev, target) {
  ev.targetId = target.id;
  selectSlot(target, FIST_SLOT);
  broadcast(room, { t: 'tnt', targetId: target.id, targetName: target.name });
}

function begin(room) {
  const alive = alivePlayers(room);
  if (alive.length < 2) return null;
  const target = pick(alive);
  selectSlot(target, FIST_SLOT);
  return {
    targetId: target.id,
    bounty: TNT_EVENT.reward,
    fuseMs: TNT_EVENT.minFuseMs + Math.floor(Math.random() * (TNT_EVENT.maxFuseMs - TNT_EVENT.minFuseMs + 1)),
    exploded: false,
  };
}

// Hạn nổ không đổi khi chuyền; không gửi hạn thật cho client để không thể canh giây cuối.
function tick(room, ev, now, dealDamage) {
  const alive = alivePlayers(room);
  if (alive.length < 2) return { reason: 'insufficient' };
  let target = room.players.get(ev.targetId);
  if (!target || target.dead) {
    target = pick(alive);
    assign(room, ev, target);
  }
  selectSlot(target, FIST_SLOT);
  if (now < ev.introEndsAt + ev.fuseMs) return;
  ev.exploded = true;
  target.score -= TNT_EVENT.penalty;
  for (const p of room.players.values()) {
    if (p !== target) p.score += TNT_EVENT.reward;
  }
  broadcast(room, { t: 'tntboom', at: [target.x, target.y, target.z], r: TNT_EVENT.explosionRadius });
  dealDamage(room, null, target, target.hp, 'tnt');
  return { reason: 'exploded', loserId: target.id, loserName: target.name, penalty: TNT_EVENT.penalty };
}

function onDown(room, ev, target) {
  if (ev.exploded || target.id !== ev.targetId) return;
  const alive = alivePlayers(room);
  if (alive.length < 2) return { reason: 'insufficient' };
  assign(room, ev, pick(alive));
}

// Cú đấm cầm TNT chỉ chuyền bom, không gây sát thương thường.
function transferTnt(room, attacker, target, now) {
  const ev = room.event;
  if (ev?.kind !== 'tnt' || ev.targetId !== attacker.id) return false;
  if (now >= ev.introEndsAt + ev.fuseMs) return true;
  assign(room, ev, target);
  return true;
}

const view = () => ({
  left: 0,
  tnt: {
    minSeconds: TNT_EVENT.minFuseMs / 1000, maxSeconds: TNT_EVENT.maxFuseMs / 1000,
    penalty: TNT_EVENT.penalty, speedMult: TNT_EVENT.speedMult,
  },
});

module.exports = {
  get durationMs() { return TNT_EVENT.maxFuseMs; },
  pauses: ['airdrop'],
  begin, tick, onDown, view, transferTnt,
  finish() {},
  debug: {
    name: 'Chuyền TNT',
    minPlayers: 2,
    options: [
      { key: 'fuse', label: 'Hạn nổ tối đa (ít nhất 15 giây)', default: 45, min: 15, max: 45, apply: (seconds) => { TNT_EVENT.maxFuseMs = seconds * 1000; } },
    ],
    length: [{ key: 'fuse', times: 1 }],
  },
};
