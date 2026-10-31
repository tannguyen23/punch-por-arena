const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers/tableGame');
const { EVENTS } = require('../server/config');
const tnt = require('../server/game/tntEvent');
const { tickEvents, clearEvents, eventView } = require('../server/game/events');
const { handlePunch } = require('../server/game/combat');
const { applyDamage } = require('../server/game/damage');
const { addToInventory, selectSlot, FIST_SLOT } = require('../server/game/inventory');
const { tryPickup } = require('../server/game/pickups');

function start(t) {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000000 });
  const fixture = setup();
  const { room, players } = fixture;
  room.phase = 'playing';
  room.endsAt = Date.now() + 300000;
  players.forEach((p, i) => { p.name = `Player ${i}`; });
  room.eventPlan = [{ kind: 'tnt', at: Date.now(), warned: true }];
  tickEvents(room, Date.now(), applyDamage);
  const carrier = room.players.get(room.event.targetId);
  const others = players.filter((p) => p !== carrier);
  return { ...fixture, carrier, others };
}

test('Ngòi nổ gồm cả hai biên 15–45 giây, không lộ hạn thật trong welcome', (t) => {
  const { room } = setup();
  t.mock.method(Math, 'random', () => 0);
  assert.equal(tnt.begin(room).fuseMs, 15000);
  Math.random.mock.mockImplementation(() => 1 - Number.EPSILON);
  assert.equal(tnt.begin(room).fuseMs, 45000);
  room.event = { kind: 'tnt', ...tnt.begin(room), introEndsAt: Date.now() + 6000, endsAt: Date.now() + 51000 };
  const view = eventView(room);
  assert.equal(view.left, 0);
  assert.equal(view.fuseMs, undefined);
  assert.deepEqual(view.tnt, { minSeconds: 15, maxSeconds: 45, penalty: 100, speedMult: 1.25 });
  assert.equal(view.targetId, room.event.targetId);
  for (const p of room.players.values()) p.dead = true;
  assert.equal(tnt.begin(room), null);
});

test('Đứng hình không chuyền; đấm đúng tầm mới chuyền, không mất máu, không đặt lại giờ', (t) => {
  const { room, carrier, others: [other, far] } = start(t);
  carrier.x = 0; carrier.z = 0; carrier.y = 0; carrier.yaw = 0;
  other.x = 0; other.z = 1.5; other.y = 0; other.yaw = Math.PI;
  far.x = 20; far.z = 20;
  room.punchBlockers = [];
  const fuse = room.event.fuseMs;
  handlePunch(room, carrier, 'R');
  assert.equal(room.event.targetId, carrier.id);
  t.mock.timers.tick(EVENTS.introMs);
  other.z = 20;
  handlePunch(room, carrier, 'R');
  assert.equal(room.event.targetId, carrier.id);
  t.mock.timers.tick(1000);
  other.z = 1.5;
  room.punchBlockers = [{ x: 0, z: 0.75, w: 2, d: 0.2 }];
  handlePunch(room, carrier, 'R');
  assert.equal(room.event.targetId, carrier.id);
  t.mock.timers.tick(1000);
  room.punchBlockers = [];
  handlePunch(room, carrier, 'R');
  assert.equal(room.event.targetId, other.id);
  assert.equal(other.hp, 100);
  assert.equal(room.event.fuseMs, fuse);
  handlePunch(room, other, 'L');
  assert.equal(room.event.targetId, carrier.id);
  assert.equal(carrier.hp, 100);
});

test('Người cầm giữ túi, không đổi / nhặt vũ khí nhưng vẫn uống potion', (t) => {
  const { room, carrier } = start(t);
  carrier.slots[0] = { weapon: 'pistol', ammo: 8 };
  selectSlot(carrier, 0);
  assert.equal(carrier.activeSlot, FIST_SLOT);
  assert.equal(addToInventory(carrier, 'pistol', 4), false);
  room.pickups.set(1, { id: 1, potion: 'grow', x: carrier.x, z: carrier.z, landsAt: 0 });
  t.mock.timers.tick(EVENTS.introMs);
  tryPickup(room, carrier);
  assert.equal(carrier.potion.id, 'grow');
  assert.equal(carrier.slots[0].ammo, 8);
});

test('Nổ sau intro và đúng hạn: hạ gục, −100 có thể âm, mọi người khác +30 chỉ một lần', (t) => {
  const { room, carrier, others } = start(t);
  others[1].dead = true;
  const fuse = room.event.fuseMs;
  t.mock.timers.tick(EVENTS.introMs + fuse - 1);
  tickEvents(room, Date.now(), applyDamage);
  assert.equal(carrier.dead, false);
  assert.equal(carrier.score, 0);
  t.mock.timers.tick(1);
  tickEvents(room, Date.now(), applyDamage);
  assert.equal(room.event, null);
  assert.equal(carrier.hp, 0);
  assert.equal(carrier.dead, true);
  assert.equal(carrier.score, -100);
  assert.deepEqual(others.map((p) => p.score), [30, 30]);
  assert.ok(others.every((p) => p.kills === 0));
  assert.equal(carrier.messages.filter((m) => m.t === 'tntboom').length, 1);
  tickEvents(room, Date.now(), applyDamage);
  assert.equal(carrier.score, -100);
  t.mock.timers.tick(10000);
  assert.equal(carrier.dead, false);
});

test('Người cầm chết / thoát: chuyền ngẫu nhiên và giữ nguyên hạn nổ', (t) => {
  const { room, carrier } = start(t);
  t.mock.timers.tick(EVENTS.introMs);
  const fuse = room.event.fuseMs;
  carrier.dead = true;
  tnt.onDown(room, room.event, carrier);
  assert.notEqual(room.event.targetId, carrier.id);
  assert.equal(room.event.fuseMs, fuse);
  carrier.dead = false;
  const leavingId = room.event.targetId;
  room.players.delete(leavingId);
  tickEvents(room, Date.now(), applyDamage);
  assert.notEqual(room.event.targetId, leavingId);
  assert.equal(room.event.fuseMs, fuse);
});

test('Thiếu người / hết trận: huỷ không thưởng phạt, phòng khác không bị ảnh hưởng', (t) => {
  const { room, carrier, others } = start(t);
  const separate = setup();
  others.forEach((p) => { p.dead = true; });
  tickEvents(room, Date.now(), applyDamage);
  assert.equal(room.event, null);
  assert.equal(carrier.score, 0);
  assert.equal(separate.players[0].messages.length, 0);
  others.forEach((p) => { p.dead = false; });
  room.eventPlan = [{ kind: 'tnt', at: Date.now(), warned: true }];
  tickEvents(room, Date.now(), applyDamage);
  clearEvents(room);
  assert.equal(room.event, null);
  assert.ok([...room.players.values()].every((p) => p.score === 0));
});
