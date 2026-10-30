const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers/tableGame');
const config = require('../server/config');
const { planEvents, tickEvents, clearEvents } = require('../server/game/events');

function start(t) {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000000 });
  t.mock.method(Math, 'random', () => 0);
  const oldEvents = { ...config.EVENTS };
  const oldTest = config.TEST.enabled;
  t.after(() => {
    Object.assign(config.EVENTS, oldEvents);
    config.TEST.enabled = oldTest;
  });
  Object.assign(config.EVENTS, { only: null, sequence: [], count: 3 });
  config.TEST.enabled = false;
  const { room } = setup();
  room.phase = 'playing';
  room.endsAt = Date.now() + 420000;
  return room;
}

test('Lịch không lặp cùng loại, kể cả qua trận mới; phòng khác nhớ độc lập', (t) => {
  const room = start(t);
  room.lastEventKind = 'dog';
  for (let i = 0; i < 10; i++) {
    planEvents(room, Date.now());
    assert.equal(room.eventPlan.length, 3);
    const kinds = [room.lastEventKind, ...room.eventPlan.map((ev) => ev.kind)];
    assert.ok(kinds.slice(1).every((kind, index) => kind !== kinds[index]));
  }
  const other = setup().room;
  other.endsAt = room.endsAt;
  planEvents(other, Date.now());
  assert.equal(other.eventPlan[0].kind, 'dog');
  room.eventPlan = [{ kind: 'tnt', at: Date.now() }];
  tickEvents(room, Date.now());
  assert.equal(room.lastEventKind, 'tnt');
  clearEvents(room);
  planEvents(room, Date.now());
  assert.equal(room.lastEventKind, 'tnt');
  assert.notEqual(room.eventPlan[0].kind, 'tnt');
});

test('Lịch bị bỏ một ô vẫn không lặp lần chạy thật; bắt đầu thất bại không ghi lịch sử', (t) => {
  const room = start(t);
  room.lastEventKind = 'dog';
  room.eventPlan = [{ kind: 'dog', at: Date.now() }];
  tickEvents(room, Date.now());
  assert.equal(room.event.kind, 'duel');
  assert.equal(room.lastEventKind, 'duel');
  clearEvents(room);
  room.mapData = { ...room.mapData, ring: null };
  room.eventPlan = [{ kind: 'duel', at: Date.now() }];
  room.lastEventKind = 'tnt';
  tickEvents(room, Date.now());
  assert.equal(room.event, null);
  assert.equal(room.lastEventKind, 'tnt');
});

test('Test thứ tự cố định và chế độ ép một loại vẫn lặp được', (t) => {
  const room = start(t);
  config.TEST.enabled = true;
  config.EVENTS.sequence = ['dog', 'dog'];
  room.lastEventKind = 'dog';
  planEvents(room, Date.now());
  assert.ok(room.eventPlan.every((ev) => ev.kind === 'dog'));
  room.eventPlan[0].at = Date.now();
  tickEvents(room, Date.now());
  assert.equal(room.event.kind, 'dog');
  clearEvents(room);
  config.TEST.enabled = false;
  config.EVENTS.only = 'dog';
  room.eventPlan = [{ kind: 'dog', at: Date.now() }];
  tickEvents(room, Date.now());
  assert.equal(room.event.kind, 'dog');
});
