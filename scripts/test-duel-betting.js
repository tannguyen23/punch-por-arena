const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupDuel, beginDuel } = require('./helpers/duel');
const duel = require('../server/game/duelEvent');
const { DUEL } = require('../server/config');

test('Có người xem: cược đủ là đánh ngay; hết 5 giây không cược cũng đánh', (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000000 });
  for (const count of [3, 5, 7]) {
    const { room, players } = setupDuel(count);
    const ev = beginDuel(room);
    const spectator = players.find((p) => !ev.fighters.includes(p.id));
    duel.handleBet(room, room.players.get(ev.fighters[0]), 0);
    assert.equal(ev.bets.size, 0);
    duel.handleBet(room, spectator, 2);
    assert.equal(ev.bets.size, 0);
    t.mock.timers.tick(100);
    duel.handleBet(room, spectator, 1);
    assert.equal(ev.stage, 'fight');
    assert.equal(ev.bets.get(spectator.id), 1);
    assert.equal(ev.roundStartedAt, Date.now());
  }
  const { room } = setupDuel(3);
  const ev = beginDuel(room);
  t.mock.timers.tick(DUEL.betMs - 1);
  duel.tick(room, ev, Date.now());
  assert.equal(ev.stage, 'bet');
  t.mock.timers.tick(1);
  duel.tick(room, ev, Date.now());
  assert.equal(ev.stage, 'fight');
});

test('Người xem thoát thì bỏ thời gian cược còn lại; không nhận cược trễ', (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000000 });
  const { room, players } = setupDuel(3);
  const ev = beginDuel(room);
  const spectator = players.find((p) => !ev.fighters.includes(p.id));
  t.mock.timers.tick(DUEL.betMs);
  duel.handleBet(room, spectator, 0);
  assert.equal(ev.bets.size, 0);
  room.players.delete(spectator.id);
  duel.tick(room, ev, Date.now());
  assert.equal(ev.stage, 'fight');
});

test('Người vào giữa chừng là người xem, không đổi đội; chờ đủ cược của tất cả người xem hiện tại', (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000000 });
  const { room, players } = setupDuel(3);
  const ev = beginDuel(room);
  const spectator = players.find((p) => !ev.fighters.includes(p.id));
  const newcomer = setupDuel(2).players[0];
  newcomer.room = room;
  room.players.set(newcomer.id, newcomer);
  const teams = ev.teams.map((ids) => [...ids]);
  duel.handleBet(room, spectator, 1);
  assert.equal(ev.stage, 'bet');
  duel.handleBet(room, newcomer, 0);
  assert.equal(ev.stage, 'fight');
  assert.deepEqual(ev.teams, teams);
  assert.equal(ev.bets.size, 2);
});
