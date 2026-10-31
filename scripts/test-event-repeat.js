const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers/tableGame');
const config = require('../server/config');
const { planEvents, tickEvents, clearEvents, eventWarnView } = require('../server/game/events');

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
  room.eventPlan = [{ kind: 'tnt', at: Date.now(), warned: true }];
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
  room.eventPlan = [{ kind: 'dog', at: Date.now(), warned: true }];
  tickEvents(room, Date.now());
  assert.equal(room.event.kind, 'duel');
  assert.equal(room.lastEventKind, 'duel');
  clearEvents(room);
  room.mapData = { ...room.mapData, ring: null };
  room.eventPlan = [{ kind: 'duel', at: Date.now(), warned: true }];
  room.lastEventKind = 'tnt';
  tickEvents(room, Date.now());
  assert.equal(room.event, null);
  assert.equal(room.lastEventKind, 'tnt');
});

test('Báo trước 5 giây đúng một lần; sự kiện không kịp thì bỏ luôn', (t) => {
  const room = start(t);
  const now = Date.now();
  const warns = () => [...room.players.values()].flatMap((p) => p.messages).filter((m) => m.t === 'eventWarn');
  room.eventPlan = [{ kind: 'dog', at: now + 10000 }];

  tickEvents(room, now + 4000); // còn 6 giây: chưa báo
  assert.equal(warns().length, 0);

  tickEvents(room, now + 5000); // còn đúng 5 giây: báo
  assert.equal(warns().length, room.players.size);
  assert.equal(room.eventPlan[0].warned, true);
  assert.deepEqual(eventWarnView(room, now + 5000), { kind: 'dog', in: 5000 });

  tickEvents(room, now + 6000); // không báo lại
  assert.equal(warns().length, room.players.size);

  // Không kịp xong trước khi hết trận: bỏ mục, không báo một sự kiện sẽ không diễn ra.
  room.eventPlan = [{ kind: 'dog', at: room.endsAt - 1000 }];
  tickEvents(room, room.endsAt - 6000);
  assert.equal(room.eventPlan.length, 0);
});

test('Test thứ tự cố định và chế độ ép một loại vẫn lặp được', (t) => {
  const room = start(t);
  config.TEST.enabled = true;
  config.EVENTS.sequence = ['dog', 'dog'];
  room.lastEventKind = 'dog';
  planEvents(room, Date.now());
  assert.ok(room.eventPlan.every((ev) => ev.kind === 'dog'));
  Object.assign(room.eventPlan[0], { at: Date.now(), warned: true });
  tickEvents(room, Date.now());
  assert.equal(room.event.kind, 'dog');
  clearEvents(room);
  config.TEST.enabled = false;
  config.EVENTS.only = 'dog';
  room.eventPlan = [{ kind: 'dog', at: Date.now(), warned: true }];
  tickEvents(room, Date.now());
  assert.equal(room.event.kind, 'dog');
});

test('Hẹn đã tới hoặc còn ít hơn 5 giây (sự kiện trước chạy lố, chế độ test nối sát) vẫn báo đủ 5 giây rồi mới bắt đầu', (t) => {
  const room = start(t);
  const now = Date.now();
  const warns = () => [...room.players.values()].flatMap((p) => p.messages).filter((m) => m.t === 'eventWarn');
  room.eventPlan = [{ kind: 'dog', at: now - 2000 }]; // quá hẹn từ lâu
  tickEvents(room, now);
  assert.equal(room.event, null, 'chưa được bắt đầu ngay');
  assert.equal(warns().at(-1).in, config.EVENTS.warnMs);
  tickEvents(room, now + config.EVENTS.warnMs - 1);
  assert.equal(room.event, null);
  tickEvents(room, now + config.EVENTS.warnMs);
  assert.equal(room.event.kind, 'dog');

  clearEvents(room);
  room.eventPlan = [{ kind: 'tnt', at: now + 1500 }]; // chỉ còn 1,5 giây
  tickEvents(room, now);
  assert.equal(warns().at(-1).in, config.EVENTS.warnMs);
  assert.equal(room.eventPlan[0].at, now + config.EVENTS.warnMs);
});
