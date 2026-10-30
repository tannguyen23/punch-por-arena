const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers/tableGame');
const { BIG_PUNCH } = require('../server/config');
const { drinkPotion, clearPotion, potionInfo } = require('../server/game/potions');
const { startCharge, releaseCharge } = require('../server/game/bigPunch');

test('Hoá to có 400 HP, giữ tỉ lệ máu; client nhận hồi chiêu 2,5 giây', () => {
  const { players: [a] } = setup();
  drinkPotion(a, 'grow');
  assert.equal(a.maxHp, 400);
  assert.equal(a.hp, 400);
  clearPotion(a);
  a.hp = 50;
  drinkPotion(a, 'grow');
  assert.equal(a.hp, 200);
  clearPotion(a);
  assert.equal(a.maxHp, 100);
  assert.equal(a.hp, 50);
  assert.equal(potionInfo().grow.bigPunch.cooldownMs, 2500);
  assert.equal(potionInfo().shrink.hpMult, 0.5);
});

test('Đấm trúng tới bán kính 15m, ngoài vùng không trúng; hồi chiêu đúng 2,5 giây', (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000000 });
  const { room, players: [a, b, c] } = setup();
  room.phase = 'playing';
  room.punchBlockers = [];
  Object.assign(a, { x: 0, z: 0, y: 0, yaw: 0 });
  Object.assign(b, { x: 15, z: BIG_PUNCH.reach, y: 0 });
  Object.assign(c, { x: 15.1, z: BIG_PUNCH.reach, y: 0 });
  drinkPotion(a, 'grow');
  startCharge(room, a);
  t.mock.timers.tick(BIG_PUNCH.chargeMs);
  releaseCharge(room, a);
  const releasedAt = Date.now();
  assert.equal(a.bigPunchReadyAt, releasedAt + 2500);
  t.mock.timers.tick(BIG_PUNCH.impactMs);
  assert.equal(b.hp, 72);
  assert.equal(c.hp, 100);
  assert.equal(a.hp, 400);
  assert.ok(a.messages.some((m) => m.t === 'bigimpact' && m.r === 15));
  t.mock.timers.tick(2500 - BIG_PUNCH.impactMs - 1);
  startCharge(room, a);
  assert.equal(a.bigChargeAt, 0);
  t.mock.timers.tick(1);
  startCharge(room, a);
  assert.equal(a.bigChargeAt, releasedAt + 2500);
});

test('Đấm trời giáng gây 70 sát thương ở tâm và 49 ở nửa bán kính', (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000000 });
  const { room, players: [a, b, c] } = setup();
  room.phase = 'playing';
  room.punchBlockers = [];
  Object.assign(a, { x: 0, z: 0, y: 0, yaw: 0 });
  Object.assign(b, { x: 0, z: BIG_PUNCH.reach, y: 0 });
  Object.assign(c, { x: 7.5, z: BIG_PUNCH.reach, y: 0 });
  drinkPotion(a, 'grow');
  startCharge(room, a);
  t.mock.timers.tick(BIG_PUNCH.chargeMs);
  releaseCharge(room, a);
  t.mock.timers.tick(BIG_PUNCH.impactMs);
  assert.equal(b.hp, 30);
  assert.equal(c.hp, 51);
});
