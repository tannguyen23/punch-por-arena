const { setup } = require('./tableGame');
const { createPlayer } = require('../../server/game/players');
const duel = require('../../server/game/duelEvent');

function setupDuel(count) {
  const { room, players } = setup();
  while (players.length > count) room.players.delete(players.pop().id);
  while (players.length < count) {
    const messages = [];
    const p = createPlayer({ OPEN: 1, readyState: 1, send: (data) => messages.push(JSON.parse(data)) });
    Object.assign(p, { room, joined: true, messages });
    room.players.set(p.id, p);
    players.push(p);
  }
  players.forEach((p, index) => { p.name = `Player ${index + 1}`; });
  room.phase = 'playing';
  room.endsAt = Date.now() + 420000;
  room.punchBlockers = [];
  return { room, players };
}

function beginDuel(room) {
  const ev = { ...duel.begin(room), kind: 'duel', introEndsAt: Date.now(), endsAt: room.endsAt };
  room.event = ev;
  duel.tick(room, ev, Date.now());
  return ev;
}

module.exports = { setupDuel, beginDuel };
