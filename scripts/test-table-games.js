const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers/tableGame');
const { handleTable, closeTable, clearTableGames, tickTableGames, tableViews } = require('../server/game/tableGames');
const { applyClientState } = require('../server/game/movement');
const { applyDamage } = require('../server/game/damage');
const { cantAct, isHeld } = require('../server/game/restrictions');
const { tickRoom, endMatch } = require('../server/game/match');
const { tickEvents, clearEvents } = require('../server/game/events');
const { leaveRoom } = require('../server/game/leave');
const { startNuke, clearNuke } = require('../server/game/nuke');

test('Chỉ nhận bàn thật ở gần, trên đất và đúng pha; tối đa hai người', () => {
  const { room, id, players: [a, b, c], join } = setup();
  a.x += 50;
  join(a);
  assert.equal(a.messages.at(-1).reason, 'too_far');
  a.x -= 50;
  a.y += 1;
  join(a);
  assert.equal(a.messages.at(-1).reason, 'too_far');
  a.y -= 1;
  handleTable(room, a, { action: 'join', id: -1 });
  assert.equal(a.messages.at(-1).reason, 'bad_table');
  room.phase = 'countdown';
  join(a);
  assert.equal(a.messages.at(-1).reason, 'unavailable');
  room.phase = 'playing';
  join(a); join(b); join(c);
  assert.equal(c.messages.at(-1).reason, 'full');
  handleTable(room, c, { action: 'move', cell: 0 });
  assert.equal(c.messages.at(-1).reason, 'not_seated');
  assert.deepEqual(room.tableGames.get(id).players, [a.id, b.id]);
});

test('Đúng lượt, đúng ô; cả hai đồng ý mới chơi lại và đổi bên đi trước', () => {
  const { room, id, players: [a, b], join } = setup();
  join(a); join(b);
  const move = (p, cell) => handleTable(room, p, { action: 'move', cell });
  move(b, 0);
  assert.equal(b.messages.at(-1).reason, 'not_turn');
  for (const cell of [-1, 9, 0.1, '0', null]) {
    move(a, cell);
    assert.equal(a.messages.at(-1).reason, 'bad_cell');
  }
  move(a, 0); move(b, 0);
  assert.equal(b.messages.at(-1).reason, 'bad_cell');
  move(b, 3); move(a, 1); move(b, 4); move(a, 2);
  const game = room.tableGames.get(id);
  assert.equal(game.winner, 0);
  handleTable(room, a, { action: 'replay' });
  handleTable(room, a, { action: 'replay' });
  assert.equal(game.stage, 'finished');
  handleTable(room, b, { action: 'replay' });
  assert.equal(game.stage, 'playing');
  assert.equal(game.turn, 1);
  assert.deepEqual(game.board, Array(9).fill(null));
});

test('Miễn sát thương, chặn di chuyển/hành động; rời bàn gỡ bảo vệ cho cả hai', () => {
  const { room, id, players: [a, b, c], join } = setup();
  room.phase = 'playing';
  join(a); join(b);
  const before = { x: a.x, z: a.z, hp: a.hp };
  assert.ok(cantAct(room, a));
  assert.ok(isHeld(room, a));
  applyClientState(room, a, { x: 0, z: 0, y: 0, yaw: 0 });
  applyDamage(room, c, a, 100, 'lightning');
  assert.deepEqual({ x: a.x, z: a.z, hp: a.hp }, before);
  closeTable(room, id, 'left');
  assert.equal(a.tableId, null);
  assert.equal(b.tableId, null);
  applyDamage(room, c, a, 10);
  assert.equal(a.hp, before.hp - 10);
});

test('Hết giờ chờ, hết lượt và hết màn kết quả đều được xử lý', () => {
  const { room, id, players: [a, b], join } = setup();
  join(a);
  tickTableGames(room, room.tableGames.get(id).endsAt);
  assert.equal(a.tableId, null);
  join(a); join(b);
  const game = room.tableGames.get(id);
  game.endsAt = Date.now() - 1;
  handleTable(room, a, { action: 'move', cell: 0 });
  assert.equal(game.winner, 1);
  assert.equal(game.reason, 'timeout');
  assert.equal(game.board[0], null);
  assert.ok(tableViews(room)[0].left > 0);
  tickTableGames(room, game.endsAt);
  assert.equal(room.tableGames.size, 0);
  assert.equal(b.tableId, null);
});

test('Rời phòng/kick, chuyển pha và sự kiện đều đóng bàn; không ảnh hưởng phòng khác', () => {
  const { room, players: [a, b], join } = setup();
  const other = setup();
  other.join(other.players[0]);
  join(a); join(b);
  leaveRoom(a, { kicked: true });
  assert.equal(b.tableId, null);
  assert.equal(room.tableGames.size, 0);
  join(b);
  for (const p of room.players.values()) p.ready = true;
  tickRoom(room);
  assert.equal(room.phase, 'countdown');
  assert.equal(b.tableId, null);
  room.phase = 'playing';
  join(b);
  room.endsAt = Date.now() + 300000;
  room.eventPlan = [{ kind: 'dog', at: 0, warned: true }];
  tickEvents(room, Date.now());
  assert.ok(room.event);
  assert.equal(b.tableId, null);
  clearEvents(room);
  join(b);
  endMatch(room);
  assert.equal(room.tableGames.size, 0);
  assert.equal(other.room.tableGames.size, 1);
  try {
    assert.ok(startNuke(other.room, other.players[1], 0, 0));
    assert.equal(other.players[0].tableId, null);
    other.join(other.players[2]);
    assert.equal(other.players[2].messages.at(-1).reason, 'unavailable');
  } finally {
    clearNuke(other.room);
    clearTableGames(other.room, 'match');
  }
});
