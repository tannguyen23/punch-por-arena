const { DUEL } = require('../config');
const { countBets } = require('./duelBets');
const { audienceView } = require('./duelAudience');

const rounds = () => DUEL.winsNeeded * 2 - 1;
const durationMs = () => DUEL.betMs + rounds() * DUEL.roundEstimateMs + (rounds() - 1) * DUEL.breakMs + DUEL.finishMs;
const playerView = (room, id) => {
  const p = room.players.get(id);
  return { id, name: p?.name ?? '', alive: Boolean(p && !p.dead) };
};

function duelView(room, ev, now = Date.now()) {
  return {
    stage: ev.stage, round: ev.round, rounds: rounds(), winsNeeded: DUEL.winsNeeded,
    wins: ev.wins, roundWinner: ev.roundWinner, winnerTeam: ev.winnerTeam,
    fighters: ev.fighters.map((id) => playerView(room, id)),
    teams: ev.teams.map((ids) => ({ members: ids.map((id) => playerView(room, id)) })),
    counts: countBets(ev), stake: DUEL.stake, prize: DUEL.prize, betMs: DUEL.betMs,
    fighterMargin: DUEL.fighterMargin, spectatorEdge: DUEL.spectatorEdge,
    stageLeft: ev.stageEndsAt ? Math.max(0, ev.stageEndsAt - now) : 0,
    audience: audienceView(room, ev, now),
  };
}

const seconds = (key, label, value, min, max, configKey = `${key}Ms`) => ({ key, label, default: value, min, max, apply: (n) => { DUEL[configKey] = n * 1000; } });
const debug = {
  name: 'Đấu đội võ đài',
  minPlayers: 3,
  options: [
    seconds('bet', 'Cược tối đa (bỏ qua nếu không có người xem)', 5, 2, 120),
    seconds('round', 'Dự tính mỗi hiệp (xếp lịch)', 6, 3, 120, 'roundEstimateMs'),
    seconds('break', 'Nghỉ giữa hiệp', 2, 1, 30),
    seconds('finish', 'Xem kết quả', 2, 1, 30),
    seconds('stall', 'Hết hiệp nếu không ai trúng đòn', 10, 3, 120),
  ],
  length: [{ key: 'bet', times: 1 }, { key: 'round', times: rounds() }, { key: 'break', times: rounds() - 1 }, { key: 'finish', times: 1 }],
};

module.exports = { duelView, durationMs, debug };
