const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers/tableGame');
const { EVENTS, VOID_FALL_DEATH_MS, RADIO_STREAK_KILLS } = require('../server/config');
const { tickEvents, clearEvents, isPaused } = require('../server/game/events');
const { applyDamage } = require('../server/game/damage');
const { tickRoom } = require('../server/game/match');
const { applyClientState } = require('../server/game/movement');
const { handleRadioCall } = require('../server/game/radioCall');

function start(t) {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000000 });
  const fixture = setup();
  const { room } = fixture;
  room.phase = 'playing';
  room.endsAt = Date.now() + 300000;
  room.eventPlan = [{ kind: 'tnt', at: Date.now() }];
  tickEvents(room, Date.now(), applyDamage);
  t.mock.timers.tick(EVENTS.introMs);
  return fixture;
}

test('TNT chặn mọi nguồn sát thương, cả source TNT giả; hết sự kiện nhận sát thương bình thường', (t) => {
  const { room, players: [a, b, c] } = start(t);
  for (const source of [null, 'lightning', 'fall', 'cactus', 'nuke', 'tnt']) {
    applyDamage(room, a, b, 100, source);
    applyDamage(room, null, a, 100, source);
    applyDamage(room, c, c, 100, source);
  }
  assert.ok([a, b, c].every((p) => p.hp === 100 && !p.dead && p.score === 0 && p.kills === 0));
  assert.equal(a.messages.filter((m) => m.t === 'hit').length, 0);
  clearEvents(room);
  applyDamage(room, a, b, 10);
  applyDamage(room, null, c, 10, 'lightning');
  assert.equal(b.hp, 90);
  assert.equal(c.hp, 90);
});

test('TNT tạm ngưng hòm mới, giữ hòm cũ và vẫn sinh potion; kết thúc thì thả hòm lại', (t) => {
  const { room, players: [a] } = start(t);
  assert.equal(isPaused(room, 'airdrop'), true);
  assert.equal(isPaused(room, 'potion'), false);
  const oldCrate = { id: room.nextPickupId++, weapon: 'pistol', x: 0, z: 0, landsAt: 0 };
  room.pickups.set(oldCrate.id, oldCrate);
  room.nextAirdropAt = Date.now();
  room.nextPotionAt = Date.now();
  a.streak = RADIO_STREAK_KILLS;
  handleRadioCall(room, a);
  assert.equal(a.streak, RADIO_STREAK_KILLS);
  assert.equal(room.pickups.size, 1);
  tickRoom(room);
  assert.equal(room.pickups.get(oldCrate.id), oldCrate);
  assert.equal(a.messages.filter((m) => m.t === 'airdrop').length, 0);
  assert.equal(a.messages.filter((m) => m.t === 'potiondrop').length, 1);
  assert.equal(room.nextAirdropAt, Date.now() + EVENTS.retryMs);
  clearEvents(room);
  t.mock.timers.tick(EVENTS.retryMs);
  tickRoom(room);
  assert.ok(a.messages.some((m) => m.t === 'airdrop'));
});

test('Rơi dưới đảo trong TNT được đưa về sân, không mất máu / đồ / TNT', (t) => {
  const { room, players: [a] } = start(t);
  room.event.targetId = a.id;
  a.hp = 63;
  a.slots[0] = { weapon: 'pistol', ammo: 8 };
  const groundAt = room.terrain.groundAt;
  room.terrain.groundAt = (x, z, y) => y < -10 ? -Infinity : groundAt(x, z, y);
  a.y = -20;
  a.fallStartedAt = Date.now() - VOID_FALL_DEATH_MS;
  applyClientState(room, a, { x: a.x, z: a.z, y: -21, yaw: 0 });
  assert.equal(a.hp, 63);
  assert.equal(a.dead, false);
  assert.equal(a.slots[0].ammo, 8);
  assert.equal(room.event.targetId, a.id);
  assert.equal(a.fallStartedAt, 0);
  assert.ok(Number.isFinite(a.y) && a.y > -10);
  assert.equal(a.messages.at(-1).t, 'setpos');
  assert.equal(a.messages.at(-1).y, a.y);
});
