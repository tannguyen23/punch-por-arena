const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupDuel, beginDuel } = require('./helpers/duel');
const duel = require('../server/game/duelEvent');
const { handleAudienceThrow, tickAudience, audienceView } = require('../server/game/duelAudience');
const { planThrow } = require('../server/game/duelThrow');
const { DUEL_AUDIENCE } = require('../server/config');
const { tryPickup } = require('../server/game/pickups');
const { handlePunch } = require('../server/game/combat');
const { handleDrop } = require('../server/game/drops');
const { clearEvents } = require('../server/game/events');
const { createPlayer } = require('../server/game/players');

function fixture(t) {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000000 });
  const { room, players } = setupDuel(3);
  const ev = beginDuel(room);
  const spectator = players.find((p) => !ev.fighters.includes(p.id));
  duel.handleBet(room, spectator, 0);
  const ring = room.mapData.ring;
  room.terrain.heightAt = () => 0;
  room.terrain.groundAt = () => 0;
  room.terrain.isSupported = () => true;
  Object.assign(spectator, { x: ring.x, z: ring.z - ring.half - 1, y: 0 });
  const fighters = ev.fighters.map((id) => room.players.get(id));
  const message = (kind = 'knife') => ({ kind, yaw: 0, pitch: 0.6 });
  return { room, ev, spectator, fighters, message };
}

test('Dao bay có dấu chỗ rơi, chạm đất mới nhặt; chỉ võ sĩ nhặt và chém đúng 3 lần', (t) => {
  const { room, ev, spectator, fighters: [a, b], message } = fixture(t);
  const slots = JSON.stringify(spectator.slots);
  handleAudienceThrow(room, spectator, message());
  const view = audienceView(room, ev, Date.now());
  assert.equal(view.kits[0].knives, 0);
  assert.equal(view.flights[0].kind, 'knife');
  assert.ok(view.flights[0].landing);
  assert.equal(room.pickups.size, 0);
  t.mock.timers.tick(DUEL_AUDIENCE.maxFlightMs);
  tickAudience(room, ev, Date.now());
  const pickup = [...room.pickups.values()][0];
  assert.equal(pickup.ammo, 3);
  Object.assign(spectator, { x: pickup.x, y: pickup.y, z: pickup.z });
  tryPickup(room, spectator);
  assert.equal(room.pickups.size, 1);
  Object.assign(a, { x: pickup.x, y: pickup.y, z: pickup.z, yaw: 0 });
  tryPickup(room, a);
  assert.equal(a.weapon, 'knife');
  assert.equal(a.ammo, 3);
  Object.assign(b, { x: a.x, y: a.y, z: a.z + 1 });
  for (let i = 0; i < 4; i++) {
    handlePunch(room, a, 'R');
    t.mock.timers.tick(500);
  }
  assert.equal(a.ammo, 0);
  assert.equal(b.hp, 25);
  assert.equal(JSON.stringify(spectator.slots), slots);
});

test('Cà chua trúng thân 3D chỉ phát hiệu ứng 500ms, không đổi máu, choáng hay điểm', (t) => {
  const { room, ev, spectator, fighters: [target], message } = fixture(t);
  const flight = planThrow(room, spectator, 0, 0.6);
  const seconds = 0.2;
  Object.assign(target, {
    x: flight.from.x + flight.velocity.x * seconds,
    z: flight.from.z + flight.velocity.z * seconds, y: 0,
  });
  handleAudienceThrow(room, spectator, message('tomato'));
  t.mock.timers.tick(500);
  tickAudience(room, ev, Date.now());
  const hit = spectator.messages.find((m) => m.t === 'dueltomatohit');
  assert.equal(hit.id, target.id);
  assert.equal(hit.ms, 500);
  assert.equal(target.hp, 100);
  assert.equal(target.stunnedUntil, 0);
  assert.equal(target.score, 0);
  assert.equal(ev.audience.flights.size, 0);
});

test('Đất / tường chặn đường ném; cà chua trượt hoặc bay trên đầu không báo trúng', (t) => {
  const { room, ev, spectator, fighters, message } = fixture(t);
  const before = planThrow(room, spectator, 0, 0.6);
  room.punchBlockers = [{ x: spectator.x, z: spectator.z + 1, w: 4, d: 0.3 }];
  const blocked = planThrow(room, spectator, 0, 0.6);
  assert.ok(blocked.duration < before.duration);
  handleAudienceThrow(room, spectator, message());
  assert.equal(spectator.messages.at(-1).reason, 'outside');
  room.punchBlockers = [];
  room.terrain.groundAt = () => -Infinity;
  handleAudienceThrow(room, spectator, message());
  assert.equal(spectator.messages.at(-1).reason, 'outside');
  room.terrain.groundAt = () => 0;
  for (const p of fighters) Object.assign(p, { x: spectator.x + 10, y: 0, z: spectator.z + 2 });
  handleAudienceThrow(room, spectator, message('tomato'));
  t.mock.timers.tick(DUEL_AUDIENCE.maxFlightMs);
  tickAudience(room, ev, Date.now());
  assert.ok(!spectator.messages.some((m) => m.t === 'dueltomatohit'));
  assert.equal(ev.audience.flights.size, 0);
});

test('Server kiểm tra vai, giai đoạn, dữ liệu, hồi chung 3s và số lượt; ném sai chỗ không tốn dao', (t) => {
  const { room, ev, spectator, fighters: [a], message } = fixture(t);
  handleAudienceThrow(room, a, message());
  handleAudienceThrow(room, spectator, { ...message(), pitch: NaN });
  handleAudienceThrow(room, spectator, { ...message(), yaw: Math.PI });
  assert.equal(ev.audience.flights.size, 0);
  assert.equal(audienceView(room, ev, Date.now()).kits[0].knives, 1);
  handleAudienceThrow(room, spectator, message());
  handleAudienceThrow(room, spectator, message('tomato'));
  assert.equal(ev.audience.flights.size, 1);
  t.mock.timers.tick(2999);
  handleAudienceThrow(room, spectator, message('tomato'));
  assert.equal(ev.audience.flights.size, 1);
  t.mock.timers.tick(1);
  handleAudienceThrow(room, spectator, message('tomato'));
  t.mock.timers.tick(3000);
  handleAudienceThrow(room, spectator, message('tomato'));
  t.mock.timers.tick(3000);
  handleAudienceThrow(room, spectator, message('tomato'));
  assert.equal(ev.audience.flights.size, 3);
  assert.equal(spectator.messages.at(-1).reason, 'empty');
  ev.stage = 'finish';
  handleAudienceThrow(room, spectator, message());
  assert.equal(spectator.messages.at(-1).reason, 'unavailable');
});

test('Vào muộn có bộ đồ riêng; đồng bộ tuổi quỹ đạo; dọn dao cả vứt lại khi huỷ, giữ nguyên đồ thường', (t) => {
  const { room, ev, spectator, fighters: [a], message } = fixture(t);
  handleAudienceThrow(room, spectator, message());
  t.mock.timers.tick(200);
  assert.equal(audienceView(room, ev, Date.now()).flights[0].age, 200);
  t.mock.timers.tick(3000);
  tickAudience(room, ev, Date.now());
  const pickup = [...room.pickups.values()][0];
  Object.assign(a, { x: pickup.x, y: pickup.y, z: pickup.z });
  tryPickup(room, a);
  handleDrop(room, a);
  assert.ok([...room.pickups.values()].every((p) => p.duelLoot));
  room.pickups.set(999, { id: 999, weapon: 'pistol' });
  const late = createPlayer({ OPEN: 1, readyState: 1, send() {} });
  Object.assign(late, { room, joined: true });
  room.players.set(late.id, late);
  const kit = audienceView(room, ev, Date.now()).kits.find((p) => p.id === late.id);
  assert.deepEqual([kit.knives, kit.tomatoes], [1, 2]);
  clearEvents(room);
  assert.equal(ev.audience.flights.size, 0);
  assert.deepEqual([...room.pickups.keys()], [999]);
  assert.ok(a.slots.every((slot) => !slot));
  assert.ok(spectator.messages.some((m) => m.t === 'duelaudienceclear' && m.ids.length));
});
