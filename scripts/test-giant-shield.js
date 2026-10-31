const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers/tableGame');
const { handleFire } = require('../server/game/shooting');
const { POTIONS, potionInfo, drinkPotion } = require('../server/game/potions');

function fixture(t) {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000000 });
  t.mock.method(Math, 'random', () => 0.5); // đạn không lệch
  const { room, players: [shooter, target] } = setup();
  room.phase = 'playing';
  room.endsAt = Date.now() + 300000;
  room.terrain.heightAt = () => 0;
  room.terrain.groundAt = () => 0;
  Object.assign(shooter, { x: 0, z: 0, y: 0, yaw: 0, tableId: null, weapon: 'ak47', lastAttack: 0, magazine: 30, ammo: 90 });
  shooter.slots[0] = { weapon: 'ak47', ammo: 90, magazine: 30 };
  shooter.activeSlot = 0;
  Object.assign(target, { x: 0, z: 10, y: 0, tableId: null });
  return { room, shooter, target };
}

test('Khổng lồ chỉ chịu 25% sát thương súng; người thường chịu đủ', (t) => {
  const { room, shooter, target } = fixture(t);
  handleFire(room, shooter, { yaw: 0, pitch: 0 });
  assert.equal(100 - target.hp, 16, 'người thường: AK 16');

  target.hp = target.maxHp = 400;
  drinkPotion(target, 'grow3');
  const before = target.hp;
  t.mock.timers.tick(1000);
  handleFire(room, shooter, { yaw: 0, pitch: 0 });
  assert.equal(before - target.hp, Math.round(16 * POTIONS.grow3.gunDamageMult), 'khổng lồ: 4');
});

test('Ba cỡ khổng lồ ×2 / ×3 / ×4 có 200 / 300 / 400 máu và cùng 25% sát thương súng; thuốc nhỏ không giảm', () => {
  const info = potionInfo();
  for (const scale of [2, 3, 4]) {
    const type = info[`grow${scale}`];
    assert.equal(type.scale, scale);
    assert.equal(type.hpMult, scale);
    assert.equal(type.gunDamageMult, 0.25);
    assert.ok(type.bigPunch);
  }
  assert.equal(info.grow, undefined, 'không còn thuốc grow cỡ cố định');
  assert.equal(info.shrink.gunDamageMult, 1);
  assert.equal(info.grow2.bigPunch.cooldownMs, info.grow4.bigPunch.cooldownMs, 'đấm trời giáng không đổi theo cỡ');
});
