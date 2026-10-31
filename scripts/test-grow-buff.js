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

// Sân phẳng để điểm rơi của cú nhảy dễ tính: ngắm ngang thì nhảy xa tối đa (BIG_PUNCH.leap.maxRange) theo hướng nhìn.
function flatRoom() {
  const { room, players } = setup();
  room.terrain.heightAt = () => 0;
  room.terrain.groundAt = () => 0;
  room.terrain.isSupported = () => true;
  room.phase = 'playing';
  room.punchBlockers = [];
  return { room, players };
}

const LAND_Z = BIG_PUNCH.leap.maxRange; // điểm rơi khi đứng ở (0, 0), yaw 0, ngắm ngang

test('Nhảy đấm: sóng nổ ở điểm rơi tới đúng bán kính, ngoài vùng không trúng; hồi chiêu đúng 2,5 giây', (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000000 });
  const { room, players: [a, b, c] } = flatRoom();
  Object.assign(a, { x: 0, z: 0, y: 0, yaw: 0 });
  Object.assign(b, { x: BIG_PUNCH.radius - 0.1, z: LAND_Z, y: 0 });
  Object.assign(c, { x: BIG_PUNCH.radius + 0.1, z: LAND_Z, y: 0 });
  drinkPotion(a, 'grow');
  startCharge(room, a);
  t.mock.timers.tick(BIG_PUNCH.chargeMs);
  releaseCharge(room, a, { yaw: 0, pitch: 0 });
  const releasedAt = Date.now();
  assert.equal(a.bigPunchReadyAt, releasedAt + 2500);
  const jump = a.messages.find((m) => m.t === 'bigpunch');
  assert.deepEqual(jump.to, [0, 0, LAND_Z]);
  t.mock.timers.tick(jump.duration);
  assert.ok(b.hp < 100, 'người trong vùng nổ mất máu');
  assert.equal(c.hp, 100);
  assert.equal(a.hp, 400);
  assert.ok(a.messages.some((m) => m.t === 'bigimpact' && m.r === BIG_PUNCH.radius && m.at[2] === LAND_Z));
  t.mock.timers.tick(2500 - jump.duration - 1);
  startCharge(room, a);
  assert.equal(a.bigChargeAt, 0);
  t.mock.timers.tick(1);
  startCharge(room, a);
  assert.equal(a.bigChargeAt, releasedAt + 2500);
});

test('Nhảy đấm gồng đầy gây 70 sát thương ở tâm và 49 ở nửa bán kính', (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000000 });
  const { room, players: [a, b, c] } = flatRoom();
  Object.assign(a, { x: 0, z: 0, y: 0, yaw: 0 });
  Object.assign(b, { x: 0, z: LAND_Z, y: 0 });
  Object.assign(c, { x: BIG_PUNCH.radius / 2, z: LAND_Z, y: 0 });
  drinkPotion(a, 'grow');
  startCharge(room, a);
  t.mock.timers.tick(BIG_PUNCH.chargeMs);
  releaseCharge(room, a, { yaw: 0, pitch: 0 });
  t.mock.timers.tick(a.messages.find((m) => m.t === 'bigpunch').duration);
  assert.equal(b.hp, 30);
  assert.equal(c.hp, 51);
});
