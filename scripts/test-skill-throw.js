const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupDuel } = require('./helpers/duel');
const { handleSkillThrow } = require('../server/game/skillThrow');
const { addToInventory, selectSlot, FIST_SLOT } = require('../server/game/inventory');
const { WEAPONS, weaponInfo } = require('../server/game/weapons');

function fixture(t, weapon, mockTime = true) {
  if (mockTime) t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000000 });
  const { room, players: [thrower, target] } = setupDuel(2);
  room.terrain.heightAt = () => 0;
  room.terrain.groundAt = () => 0;
  room.terrain.isSupported = () => true;
  Object.assign(thrower, { x: 0, y: 0, z: 0, yaw: 0, hp: 100, lastAttack: 0 });
  Object.assign(target, { x: 0, y: 0, z: 10, hp: 100 });
  addToInventory(thrower, weapon, WEAPONS[weapon].ammo?.[0] ?? null);
  thrower.messages.length = 0;
  target.messages.length = 0;
  return { room, thrower, target };
}

test('Mọi vũ khí cận chiến trừ hai loại găng có skill ném, client nhận thông số bay trong weaponInfo', () => {
  const info = weaponInfo();
  for (const id of ['sword', 'dagger', 'axe', 'spear', 'knife']) {
    assert.ok(info[id].throwSkill.damage > 0);
    assert.ok(info[id].throwSkill.speed > 0);
  }
  for (const id of ['thunder', 'gauntlet']) assert.equal(info[id].throwSkill, null);
  assert.equal(info.fist.throwSkill, null);
});

test('Ném kiếm trúng người: trừ máu, mất kiếm về tay không, mọi người nhận quỹ đạo', (t) => {
  const { room, thrower, target } = fixture(t, 'sword');
  assert.equal(thrower.weapon, 'sword');
  handleSkillThrow(room, thrower, { yaw: 0, pitch: 0 });
  assert.equal(target.hp, 100 - WEAPONS.sword.throwSkill.damage);
  assert.equal(thrower.weapon, 'fist');
  assert.equal(thrower.activeSlot, FIST_SLOT);
  assert.ok(thrower.slots.every((s) => !s));
  const flight = target.messages.find((m) => m.t === 'skillthrow');
  assert.equal(flight.w, 'sword');
  assert.equal(flight.hit, target.id);
  assert.ok(flight.duration > 0 && flight.duration < 1000);
});

test('Ném trượt (quay lưng lại người kia): không ai mất máu nhưng vẫn mất vũ khí', (t) => {
  const { room, thrower, target } = fixture(t, 'dagger');
  handleSkillThrow(room, thrower, { yaw: Math.PI, pitch: 0 });
  assert.equal(target.hp, 100);
  assert.equal(thrower.weapon, 'fist');
  const flight = thrower.messages.find((m) => m.t === 'skillthrow');
  assert.equal(flight.hit, null);
  assert.ok(flight.duration > 0);
});

test('Găng (không có skill), dữ liệu hỏng, đã chết, ngoài trận hoặc tay không thì không ném được', (t) => {
  const { room, thrower, target } = fixture(t, 'gauntlet');
  handleSkillThrow(room, thrower, { yaw: 0, pitch: 0 });
  assert.equal(thrower.weapon, 'gauntlet');
  assert.equal(target.hp, 100);
  const sword = fixture(t, 'sword', false);
  handleSkillThrow(sword.room, sword.thrower, { yaw: NaN, pitch: 0 });
  assert.equal(sword.thrower.weapon, 'sword');
  sword.thrower.dead = true;
  handleSkillThrow(sword.room, sword.thrower, { yaw: 0, pitch: 0 });
  assert.equal(sword.thrower.weapon, 'sword');
  const lobby = fixture(t, 'sword', false);
  lobby.room.phase = 'lobby';
  handleSkillThrow(lobby.room, lobby.thrower, { yaw: 0, pitch: 0 });
  assert.equal(lobby.thrower.weapon, 'sword');
  handleSkillThrow(room, target, { yaw: 0, pitch: 0 });
  assert.equal(target.weapon, 'fist');
  assert.equal(thrower.hp, 100);
});

test('Ném liên tục trong hồi chiêu bị bỏ qua', (t) => {
  const { room, thrower } = fixture(t, 'sword');
  addToInventory(thrower, 'dagger', null); // nhặt dao găm vào túi (đang cầm kiếm nên không tự đổi)
  selectSlot(thrower, thrower.slots.findIndex((s) => s?.weapon === 'dagger'));
  handleSkillThrow(room, thrower, { yaw: Math.PI, pitch: 0 });
  assert.equal(thrower.weapon, 'fist');
  selectSlot(thrower, thrower.slots.findIndex((s) => s?.weapon === 'sword'));
  assert.equal(thrower.weapon, 'sword');
  handleSkillThrow(room, thrower, { yaw: Math.PI, pitch: 0 });
  assert.equal(thrower.weapon, 'sword'); // còn trong hồi chiêu
  t.mock.timers.tick(700);
  handleSkillThrow(room, thrower, { yaw: Math.PI, pitch: 0 });
  assert.equal(thrower.weapon, 'fist');
});
