const { DUEL } = require('../config');
const { broadcast } = require('../net/messaging');
const { stripInventory, clearInventory } = require('./inventory');
const { clearPotion } = require('./potions');
const { placeFighters, placeSpectators } = require('./duelRing');
const { settleBets } = require('./duelBets');
const { pickTeams, fightersOf, teamOf, livingOf, allBetsPlaced, leaderIndex } = require('./duelTeams');
const { duelView, durationMs, debug } = require('./duelView');
const { createAudience, tickAudience, clearAudience } = require('./duelAudience');

const announce = (room, ev) => broadcast(room, { t: 'duel', duel: duelView(room, ev) });

function setStage(room, ev, stage, ms, now) {
  ev.stage = stage;
  ev.stageEndsAt = now + ms;
  announce(room, ev);
}

function begin(room) {
  const teams = room.mapData.ring ? pickTeams(room) : null;
  if (!teams) return null;
  for (const p of teams.flat()) {
    clearPotion(p);
    stripInventory(p);
  }
  const ids = teams.map((players) => players.map((p) => p.id));
  placeFighters(room, teams);
  placeSpectators(room, ids.flat());
  return {
    teams: ids, fighters: ids.flat(), bets: new Map(), stage: 'intro', stageEndsAt: 0,
    fighting: false, round: 0, wins: [0, 0], roundWinner: null, winnerTeam: null,
    audience: createAudience(),
  };
}

function startRound(room, ev, now) {
  ev.round++;
  ev.roundWinner = null;
  placeFighters(room, ev.teams.map((ids) => ids.map((id) => room.players.get(id))));
  ev.fighting = true;
  ev.roundStartedAt = now;
  setStage(room, ev, 'fight', 0, now);
}

function endRound(room, ev, winnerIdx, now) {
  ev.fighting = false;
  ev.roundWinner = winnerIdx;
  ev.wins[winnerIdx]++;
  if (ev.wins[winnerIdx] >= DUEL.winsNeeded) {
    ev.winnerTeam = winnerIdx;
    setStage(room, ev, 'finish', DUEL.finishMs, now);
  } else {
    setStage(room, ev, 'break', DUEL.breakMs, now);
  }
}

const stalled = (room, ev, now) => now - Math.max(ev.roundStartedAt, ...fightersOf(room, ev).map((p) => p.lastHurtAt)) >= DUEL.stallMs;

const stages = {
  intro(room, ev, now) {
    if (allBetsPlaced(room, ev)) startRound(room, ev, now);
    else setStage(room, ev, 'bet', DUEL.betMs, now);
  },
  bet(room, ev, now) {
    if (now >= ev.stageEndsAt || allBetsPlaced(room, ev)) startRound(room, ev, now);
  },
  fight(room, ev, now) {
    tickAudience(room, ev, now);
    if (stalled(room, ev, now)) endRound(room, ev, leaderIndex(room, ev), now);
  },
  break: (room, ev, now) => now >= ev.stageEndsAt && startRound(room, ev, now),
  finish(room, ev, now) {
    if (now < ev.stageEndsAt) return;
    return { reason: 'duel', winnerTeam: ev.winnerTeam, winnerIds: ev.teams[ev.winnerTeam], prize: DUEL.prize };
  },
};

function tick(room, ev, now) {
  if (fightersOf(room, ev).some((p) => !p)) return { reason: 'left' };
  if (now < ev.introEndsAt) return;
  return stages[ev.stage](room, ev, now);
}

// Gục nằm chờ; chỉ kết thúc khi đội không còn ai đứng.
function absorbLethal(room, ev, target) {
  const side = teamOf(ev, target.id);
  if (side < 0 || !ev.fighting) return false;
  target.dead = true;
  target.stunnedUntil = 0;
  target.sprinting = false;
  if (livingOf(room, ev.teams[side]).length === 0) endRound(room, ev, 1 - side, Date.now());
  else announce(room, ev);
  return true;
}

const onDown = () => undefined;

function finish(room, ev, reason) {
  clearAudience(room, ev);
  for (const p of fightersOf(room, ev)) {
    if (!p) continue;
    p.dead = false;
    p.hp = p.maxHp;
    clearInventory(p);
  }
  if (reason !== 'duel' || ev.winnerTeam === null) return;
  for (const id of ev.teams[ev.winnerTeam]) {
    const p = room.players.get(id);
    if (p) p.score += DUEL.prize;
  }
  settleBets(room, ev, ev.winnerTeam);
}

function handleBet(room, p, side) {
  const ev = room.event;
  const now = Date.now();
  if (ev?.kind !== 'duel' || ev.stage !== 'bet' || ev.fighters.includes(p.id) || !room.players.has(p.id) || (side !== 0 && side !== 1)) return;
  if (now >= ev.stageEndsAt) return;
  ev.bets.set(p.id, side);
  if (allBetsPlaced(room, ev)) startRound(room, ev, now);
  else announce(room, ev);
}

module.exports = {
  get durationMs() { return durationMs(); },
  begin, tick, onDown, finish, absorbLethal, handleBet, debug,
  view: (room, ev, now) => ({ duel: duelView(room, ev, now) }),
  pauses: ['airdrop', 'potion'],
};
