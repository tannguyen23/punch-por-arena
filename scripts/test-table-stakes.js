const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers/tableGame');
const { handleTable, tickTableGames, clearTableGames, tableViews } = require('../server/game/tableGames');
const { leaveRoom } = require('../server/game/leave');
const { settleBets } = require('../server/game/duelBets');

test('Thắng +75, thua -75 kể cả âm; kết quả không bị trả điểm hai lần', () => {
  const { room, id, players: [a, b], join, move } = setup();
  join(a); join(b);
  move(a, 0); move(b, 3); move(a, 1); move(b, 4); move(a, 2);
  assert.deepEqual([a.score, b.score], [75, -75]);
  assert.deepEqual(room.tableGames.get(id).deltas, [75, -75]);
  handleTable(room, a, { action: 'flip' });
  handleTable(room, b, { action: 'move', cell: 8 });
  handleTable(room, a, { action: 'replay' });
  assert.deepEqual([a.score, b.score], [75, -75]);
  handleTable(room, b, { action: 'replay' });
  assert.equal(room.tableGames.get(id).deltas, null);
  move(b, 0); move(a, 3); move(b, 1); move(a, 4); move(b, 2);
  assert.deepEqual([a.score, b.score], [0, 0]);
});

test('Chỉ người đúng lượt, gặp nguy cơ nối 3 mới lật được; bên kia nhận đủ 75', () => {
  for (const flippingSide of [0, 1]) {
    const { room, id, players, join, move } = setup();
    const [a, b, outsider] = players;
    join(a); join(b);
    handleTable(room, a, { action: 'flip' });
    assert.equal(a.messages.at(-1).reason, 'cannot_flip');
    move(a, 0); move(b, 3); move(a, 1);
    if (flippingSide === 0) move(b, 4);
    const p = players[flippingSide];
    const other = players[1 - flippingSide];
    assert.equal(tableViews(room)[0].flipSide, flippingSide);
    handleTable(room, other, { action: 'flip' });
    assert.equal(other.messages.at(-1).reason, 'cannot_flip');
    handleTable(room, outsider, { action: 'flip' });
    assert.equal(outsider.messages.at(-1).reason, 'not_seated');
    handleTable(room, p, { action: 'flip' });
    const game = room.tableGames.get(id);
    assert.equal(game.reason, 'flip');
    assert.equal(game.winner, 1 - flippingSide);
    assert.equal(tableViews(room)[0].flipSide, null);
    assert.equal(p.score, -50);
    assert.equal(other.score, 75);
    handleTable(room, p, { action: 'flip' });
    handleTable(room, p, { action: 'leave' });
    assert.equal(p.score, -50);
    assert.equal(other.score, 75);
  }
});

test('Hết lượt, chủ động rời hoặc mất kết nối đều thua -75; chờ một mình không mất điểm', () => {
  for (const action of ['timeout', 'leave', 'disconnect']) {
    const { room, id, players: [a, b], join } = setup();
    join(a); join(b);
    if (action === 'timeout') tickTableGames(room, room.tableGames.get(id).endsAt);
    if (action === 'leave') handleTable(room, a, { action: 'leave' });
    if (action === 'disconnect') leaveRoom(a);
    assert.deepEqual([a.score, b.score], [-75, 75]);
    clearTableGames(room, 'match');
    assert.deepEqual([a.score, b.score], [-75, 75]);
  }
  const { players: [a], join } = setup();
  join(a);
  leaveRoom(a);
  assert.equal(a.score, 0);
});

test('Hoà hoặc hệ thống huỷ ván không đổi điểm', () => {
  const { room, players: [a, b], join, move } = setup();
  join(a); join(b);
  [0, 1, 2, 4, 3, 5, 7, 6, 8].forEach((cell, index) => move(index % 2 ? b : a, cell));
  assert.deepEqual([a.score, b.score], [0, 0]);
  for (const reason of ['match', 'event', 'nuke']) {
    clearTableGames(room, reason);
    join(a); join(b);
    clearTableGames(room, reason);
    assert.deepEqual([a.score, b.score], [0, 0]);
  }
});

test('Điểm âm từ caro không biến cược solo thua thành được cộng điểm', () => {
  const { room, players: [a] } = setup();
  a.score = -50;
  settleBets(room, { bets: new Map([[a.id, 0]]) }, 1);
  assert.equal(a.score, -50);
  assert.equal(a.messages.at(-1).delta, 0);
});

test('Lật sau hạn lượt vẫn bị xử thua đủ 75 điểm', () => {
  const { room, id, players: [a, b], join, move } = setup();
  join(a); join(b);
  move(a, 0); move(b, 3); move(a, 1);
  room.tableGames.get(id).endsAt = Date.now() - 1;
  handleTable(room, b, { action: 'flip' });
  assert.equal(b.messages.at(-1).reason, 'expired');
  assert.equal(room.tableGames.get(id).reason, 'timeout');
  assert.deepEqual([a.score, b.score], [75, -75]);
});
