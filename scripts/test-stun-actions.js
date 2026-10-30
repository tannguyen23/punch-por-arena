const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers/tableGame');
const { stunPlayer } = require('../server/game/stun');
const { handlePunch } = require('../server/game/combat');
const { handleFire } = require('../server/game/shooting');
const { handlePoop, resetPoopSkill } = require('../server/game/poop');
const { addToInventory } = require('../server/game/inventory');

test('Server từ chối đấm / bắn khi choáng, không tốn đạn hay hồi chiêu; hết choáng đánh được', (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000000 });
  const { room, players: [a, b] } = setup();
  room.phase = 'playing';
  addToInventory(b, 'pistol', 8);
  stunPlayer(room, a, Date.now());
  stunPlayer(room, b, Date.now());
  const lastAttack = [a.lastAttack, b.lastAttack];
  handlePunch(room, a, 'L');
  handleFire(room, b, { yaw: 0, pitch: 0 });
  assert.deepEqual([a.lastAttack, b.lastAttack], lastAttack);
  assert.equal(b.ammo, 8);
  assert.equal(a.messages.filter((m) => ['punch', 'shot'].includes(m.t)).length, 0);
  assert.ok(a.messages.some((m) => m.t === 'setpos' && m.x === a.x && m.y === a.y && m.z === a.z));
  t.mock.timers.tick(2000);
  handlePunch(room, a, 'L');
  handleFire(room, b, { yaw: 0, pitch: 0 });
  assert.equal(b.ammo, 7);
  assert.ok(a.messages.some((m) => m.t === 'punch'));
  assert.ok(a.messages.some((m) => m.t === 'shot'));
});

test('Chó bị điện giật không dùng kỹ năng được, hết choáng dùng lại bình thường', (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000000 });
  const { room, players: [a] } = setup();
  room.phase = 'playing';
  a.dog = true;
  resetPoopSkill(a);
  const charges = a.poopCharges;
  stunPlayer(room, a, Date.now());
  handlePoop(room, a);
  assert.equal(a.poopCharges, charges);
  assert.equal(room.poops.size, 0);
  t.mock.timers.tick(2000);
  handlePoop(room, a);
  assert.equal(a.poopCharges, charges - 1);
  assert.equal(room.poops.size, 1);
});
