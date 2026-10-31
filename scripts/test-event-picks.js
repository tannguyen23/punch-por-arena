const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Room } = require('../server/game/Room');
const { getMap, defaultMapIds } = require('../server/maps');
const { planEvents, eventChoices } = require('../server/game/events');
const { sanitizeEventKinds } = require('../server/game/sanitize');
const config = require('../server/config');

const mapId = defaultMapIds[0];

function room() {
  const r = new Room('099', [mapId], getMap(mapId));
  r.phase = 'playing';
  r.endsAt = Date.now() + config.MATCH_DURATION_MS;
  return r;
}

test('Chỉ lên lịch những sự kiện phòng cho phép; bỏ chọn hết thì không có sự kiện', () => {
  const allowed = room();
  allowed.allowedEvents = ['dog'];
  planEvents(allowed, Date.now());
  assert.ok(allowed.eventPlan.length > 0, 'phải có sự kiện');
  assert.ok(allowed.eventPlan.every((event) => event.kind === 'dog'), 'chỉ được chọn hoá chó');

  const none = room();
  none.allowedEvents = [];
  planEvents(none, Date.now());
  assert.equal(none.eventPlan.length, 0, 'không có sự kiện nào');

  const all = room();
  all.allowedEvents = null;
  planEvents(all, Date.now());
  assert.ok(all.eventPlan.length > 0, 'không gửi danh sách thì dùng tất cả');
});

test('sanitizeEventKinds: không gửi = null (tất cả), bỏ chọn hết = [], bỏ id lạ và trùng', () => {
  assert.equal(sanitizeEventKinds(undefined), null);
  assert.equal(sanitizeEventKinds('dog'), null);
  assert.deepEqual(sanitizeEventKinds([]), []);
  assert.deepEqual(sanitizeEventKinds(['dog', 'dog', 'nope', 5]), ['dog']);
  assert.deepEqual(sanitizeEventKinds(['duel', 'tnt', 'dog']), ['duel', 'tnt', 'dog']);
});

test('eventChoices trả đủ loại sự kiện cho màn tạo phòng', () => {
  const choices = eventChoices();
  assert.deepEqual(choices, [
    { id: 'dog', name: 'Hoá chó', minPlayers: 1 },
    { id: 'duel', name: 'Đấu đội võ đài', minPlayers: 3 },
    { id: 'tnt', name: 'Chuyền TNT', minPlayers: 2 },
  ]);
});
