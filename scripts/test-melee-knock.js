const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers/tableGame');
const { MELEE_KNOCK } = require('../server/config');
const { handlePunch } = require('../server/game/combat');

function fixture(t) {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000000 });
  const { room, players: [a, b] } = setup();
  room.phase = 'playing';
  room.endsAt = Date.now() + 300000;
  a.tableId = null;
  b.tableId = null;
  Object.assign(a, { x: 0, z: 0, y: 0, yaw: 0, lastAttack: 0 });
  Object.assign(b, { x: 0, z: 1.5, y: 0, hp: 100 });
  room.terrain.heightAt = () => 0;
  room.terrain.groundAt = () => 0;
  return { room, a, b };
}

test('Đòn cận chiến trúng thì đẩy nạn nhân lùi ra xa người đánh, theo sát thương', (t) => {
  const { room, a, b } = fixture(t);
  handlePunch(room, a, 'R');
  const knock = b.messages.find((m) => m.t === 'knockback');
  assert.ok(knock, 'nạn nhân phải nhận knockback');
  assert.equal(knock.vx, 0);
  assert.ok(knock.vz > 0 && knock.vz <= MELEE_KNOCK.max, `vz = ${knock.vz}`);
  assert.equal(knock.vy, undefined, 'không có vy để khỏi cắt cú rơi / nhảy');
  assert.equal(b.hp, 90);
  assert.equal(a.messages.filter((m) => m.t === 'knockback').length, 0);
});

test('Hạ gục thì tin hit có cờ ko và không đẩy người đã chết; đòn hụt không đẩy', (t) => {
  const { room, a, b } = fixture(t);
  b.hp = 5;
  handlePunch(room, a, 'R');
  assert.ok(b.dead);
  assert.equal(b.messages.filter((m) => m.t === 'knockback').length, 0);
  assert.equal(a.messages.find((m) => m.t === 'hit').ko, true);
});

test('Đòn hụt (ngoài tầm) không đẩy ai', (t) => {
  const { room, a, b } = fixture(t);
  b.z = 30;
  handlePunch(room, a, 'R');
  assert.equal(b.messages.filter((m) => m.t === 'knockback').length, 0);
});

test('Tin hit thường không có cờ ko', (t) => {
  const { room, a, b } = fixture(t);
  handlePunch(room, a, 'R');
  assert.equal(b.messages.find((m) => m.t === 'hit').ko, undefined);
});
