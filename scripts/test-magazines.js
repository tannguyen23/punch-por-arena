const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupDuel } = require('./helpers/duel');
const { WEAPONS, rollAmmo, weaponInfo } = require('../server/game/weapons');
const { addToInventory, selectSlot, takeActive, useAmmo, clearInventory, stripInventory, slotsView, FIST_SLOT } = require('../server/game/inventory');
const { handleReload, updateReload } = require('../server/game/magazines');
const { handleFire } = require('../server/game/shooting');
const { dropLoot } = require('../server/game/loot');
const { tryPickup } = require('../server/game/pickups');
const { buildSnapshot } = require('../server/game/snapshot');
const { blast } = require('../server/game/explosion');
const { stepRockets } = require('../server/game/rockets');
const { BODY_RADIUS } = require('../server/config');

function fixture(t) {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000000 });
  const { room, players } = setupDuel(2);
  room.punchBlockers = [];
  room.terrain.heightAt = () => 0;
  room.terrain.groundAt = () => 0;
  Object.assign(players[0], { x: 0, y: 0, z: 0 });
  Object.assign(players[1], { x: 20, y: 0, z: 0 });
  return { room, p: players[0], other: players[1] };
}

test('Mỗi súng có đúng 3 băng: bắn hết băng bị chặn, thay đúng hạn, không tạo thêm đạn', (t) => {
  const { room, p } = fixture(t);
  for (const [id, capacity, total] of [['pistol', 12, 36], ['ak47', 30, 90]]) {
    stripInventory(p);
    addToInventory(p, id, rollAmmo(id));
    assert.deepEqual([p.ammo, p.magazine], [total, capacity]);
    const weapon = WEAPONS[id];
    let fired = 0;
    for (let magazine = 0; magazine < 3; magazine++) {
      for (let i = 0; i < capacity; i++) {
        t.mock.timers.tick(weapon.cooldown);
        handleFire(room, p, { yaw: 0, pitch: 0 });
        fired++;
      }
      assert.equal(p.magazine, 0);
      assert.equal(p.ammo, total - fired);
      t.mock.timers.tick(weapon.cooldown);
      handleFire(room, p, { yaw: 0, pitch: 0 });
      assert.equal(p.ammo, total - fired);
      handleReload(room, p);
      if (magazine === 2) {
        assert.equal(p.reload, null);
        assert.equal(p.messages.at(-1).reason, 'empty');
        continue;
      }
      handleReload(room, p);
      const deadline = p.reload.endsAt;
      t.mock.timers.tick(weapon.reloadMs - 1);
      handleFire(room, p, { yaw: 0, pitch: 0 });
      assert.equal(p.magazine, 0);
      assert.equal(p.reload.endsAt, deadline);
      t.mock.timers.tick(1);
      const view = buildSnapshot(room).players.find((o) => o.id === p.id);
      assert.deepEqual([view.a, view.mg, view.rl], [total - fired, capacity, 0]);
    }
    assert.equal(p.messages.filter((m) => m.t === 'shot' && m.w === id).length, total);
  }
});

test('Thay sớm chỉ nạp phần thiếu; đổi ô, vứt, chết, đứng hình, choáng, hết trận đều huỷ', (t) => {
  const { room, p } = fixture(t);
  addToInventory(p, 'pistol', 36);
  useAmmo(p);
  handleReload(room, p);
  t.mock.timers.tick(WEAPONS.pistol.reloadMs);
  updateReload(room, p);
  assert.deepEqual([p.ammo, p.magazine], [35, 12]);
  handleReload(room, p);
  assert.equal(p.messages.at(-1).reason, 'full');
  for (const cancel of [
    () => selectSlot(p, FIST_SLOT),
    () => takeActive(p),
    () => clearInventory(p),
    () => stripInventory(p),
    () => { p.dead = true; },
    () => { room.frozenUntil = Date.now() + 10000; },
    () => { p.stunnedUntil = Date.now() + 10000; },
    () => { room.phase = 'ended'; },
  ]) {
    p.dead = false;
    p.stunnedUntil = 0;
    room.phase = 'playing';
    room.frozenUntil = 0;
    stripInventory(p);
    addToInventory(p, 'pistol', 36);
    useAmmo(p);
    handleReload(room, p);
    assert.ok(p.reload);
    cancel();
    updateReload(room, p);
    assert.equal(p.reload, null);
    t.mock.timers.tick(3000);
    updateReload(room, p);
    if (p.weapon === 'pistol') assert.equal(p.magazine, 11);
  }
});

test('Vứt / nhặt giữ băng chưa đầy; nhặt cùng súng chỉ cộng tổng đạn, không tự nạp băng', (t) => {
  const { room, p, other } = fixture(t);
  addToInventory(p, 'ak47', 90);
  for (let i = 0; i < 7; i++) useAmmo(p);
  const item = takeActive(p);
  const pickup = dropLoot(room, item, { x: 5, z: 0 }, p);
  assert.deepEqual([pickup.ammo, pickup.magazine], [83, 23]);
  Object.assign(other, { x: pickup.x, z: pickup.z });
  tryPickup(room, other);
  assert.deepEqual([other.ammo, other.magazine], [83, 23]);
  addToInventory(other, 'ak47', 90);
  assert.deepEqual([other.ammo, other.magazine], [173, 23]);
  assert.deepEqual(slotsView(other)[0], ['ak47', 173, 23]);
  stripInventory(other);
  addToInventory(other, 'pistol', 2, 0);
  handleReload(room, other);
  t.mock.timers.tick(WEAPONS.pistol.reloadMs);
  updateReload(room, other);
  assert.deepEqual([other.ammo, other.magazine], [2, 2]);
});

test('Tên lửa 4 quả, 270 sát thương tâm, bán kính 12m và vẫn giảm theo khoảng cách / chặn tường', (t) => {
  const { room, p, other } = fixture(t);
  const rocket = WEAPONS.rocket;
  assert.deepEqual([rocket.damage, rocket.splash, rollAmmo('rocket')], [270, 12, 4]);
  assert.deepEqual([weaponInfo().pistol.magazineSize, weaponInfo().ak47.magazineSize], [12, 30]);
  p.x = -20;
  Object.assign(other, { x: 0, y: 0, z: 0, hp: 1000, maxHp: 1000 });
  blast(room, p, { x: 0, y: 1, z: 0 }, rocket.damage, rocket.splash);
  assert.equal(other.hp, 730);
  other.hp = 1000;
  other.x = 6 + BODY_RADIUS;
  blast(room, p, { x: 0, y: 1, z: 0 }, rocket.damage, rocket.splash);
  assert.equal(other.hp, 865);
  other.hp = 1000;
  other.x = 12 + BODY_RADIUS;
  blast(room, p, { x: 0, y: 1, z: 0 }, rocket.damage, rocket.splash);
  assert.equal(other.hp, 1000);
  other.x = 6;
  room.punchBlockers = [{ x: 3, z: 0, w: 1, d: 4 }];
  blast(room, p, { x: 0, y: 1, z: 0 }, rocket.damage, rocket.splash);
  assert.equal(other.hp, 1000);
  room.punchBlockers = [];
  addToInventory(p, 'rocket', rollAmmo('rocket'));
  handleFire(room, p, { yaw: 0, pitch: 1.4 });
  assert.equal(p.ammo, 3);
  assert.equal(room.rockets[0].weapon.damage, 270);
  stepRockets(room, 1);
  const boom = p.messages.find((m) => m.t === 'boom');
  assert.equal(boom.r, 12);
});
