const { test } = require('node:test');
const assert = require('node:assert/strict');
const { WEAPONS, randomDropWeapon, rollAmmo, weaponInfo, weaponDropInfo } = require('../server/game/weapons');
const { sanitizeWeaponWeights } = require('../server/game/sanitize');
const { WEAPON_RARITIES, AIRDROP } = require('../server/config');
const { setupDuel } = require('./helpers/duel');
const { launchAirdrop, tryPickup } = require('../server/game/pickups');

const expected = { sword: 22, dagger: 28, axe: 8, spear: 7, thunder: 6, gauntlet: 4, pistol: 9, knife: 10, ak47: 5, rocket: 1 };

test('Đúng tỉ lệ từng vũ khí: 85% cận chiến, 15% súng; cấp hiếm tổng 50/25/10/15', (t) => {
  const counts = {};
  const samples = 10000;
  let sample = 0;
  t.mock.method(Math, 'random', () => (sample++ + 0.5) / samples);
  for (let i = 0; i < samples; i++) {
    const id = randomDropWeapon();
    counts[id] = (counts[id] ?? 0) + 1;
  }
  assert.deepEqual(counts, Object.fromEntries(Object.entries(expected).map(([id, weight]) => [id, weight * 100])));
  const rarityTotals = {};
  let melee = 0;
  for (const [id, weight] of Object.entries(expected)) {
    const w = WEAPONS[id];
    assert.equal(w.dropWeight, weight);
    rarityTotals[w.rarity] = (rarityTotals[w.rarity] ?? 0) + weight;
    if (w.kind === 'melee') melee += weight;
  }
  assert.equal(melee, 85);
  assert.deepEqual(rarityTotals, { common: 50, rare: 25, epic: 10, legendary: 15 });
  for (const id of ['fist', 'frag', 'flashbang', 'icegrenade', 'nuke']) assert.equal(WEAPONS[id].dropWeight, 0);
});

test('Tỷ lệ rơi riêng của phòng: chỉ nhận vũ khí rơi được, trọng số 0–100, toàn 0 thì dùng mặc định', () => {
  assert.deepEqual(sanitizeWeaponWeights({ sword: 10, pistol: 20 }), { sword: 10, pistol: 20 });
  assert.deepEqual(sanitizeWeaponWeights({ sword: -5, pistol: 250, nuke: 50, bogus: 3, axe: 2.6 }), { sword: 0, pistol: 100, axe: 3 });
  assert.equal(sanitizeWeaponWeights({}), null);
  assert.equal(sanitizeWeaponWeights({ nuke: 50, frag: 5 }), null);
  assert.equal(sanitizeWeaponWeights(null), null);
  assert.equal(sanitizeWeaponWeights([]), null);
});

test('randomDropWeapon dùng trọng số riêng; hòm chọn vũ khí theo tỷ lệ của phòng', (t) => {
  assert.equal(randomDropWeapon({ sword: 0, pistol: 1 }), 'pistol');
  const fixed = t.mock.method(Math, 'random', () => 0);
  assert.equal(randomDropWeapon({ sword: 0, pistol: 0 }), randomDropWeapon(), 'toàn 0 quay về mặc định');
  fixed.mock.restore();

  const { room } = setupDuel(2);
  room.weaponWeights = { sword: 0, pistol: 1 };
  const random = t.mock.method(Math, 'random', () => 0.99);
  launchAirdrop(room, { pos: { x: 0, z: 0 } });
  const pickup = [...room.pickups.values()][0];
  assert.equal(pickup.weapon, 'pistol');
  random.mock.restore();
});

test('weaponDropInfo trả vũ khí rơi được với trọng số mặc định và cấp hiếm', () => {
  const drops = weaponDropInfo();
  assert.equal(drops.length, Object.keys(expected).length);
  assert.deepEqual(drops.find((w) => w.id === 'sword'), {
    id: 'sword', name: 'Kiếm', kind: 'melee', weight: 22,
    rarity: { id: 'common', ...WEAPON_RARITIES.common },
  });
  assert.ok(drops.every((w) => w.weight > 0));
});

test('Welcome gửi nhãn / màu từ server; không đổi chỉ số, số đạn và thưởng lựu đạn', (t) => {
  const info = weaponInfo();
  for (const [id, w] of Object.entries(WEAPONS)) {
    assert.deepEqual(info[id].rarity, w.rarity ? { id: w.rarity, ...WEAPON_RARITIES[w.rarity] } : null);
    assert.equal(info[id].damage, w.damage);
    assert.equal(info[id].cooldown, w.cooldown);
    assert.equal(info[id].dropWeight, undefined);
  }
  assert.equal(AIRDROP.bonusChance, 0.35);
  assert.deepEqual(AIRDROP.bonus, ['frag', 'flashbang', 'icegrenade']);
  const random = t.mock.method(Math, 'random', () => 0);
  for (const [id, w] of Object.entries(WEAPONS)) assert.equal(rollAmmo(id), w.ammo?.[0] ?? null);
  random.mock.mockImplementation(() => 1 - Number.EPSILON);
  for (const [id, w] of Object.entries(WEAPONS)) assert.equal(rollAmmo(id), w.ammo?.[1] ?? null);
});

test('Mỗi món trong bảng thực sự rơi từ hòm ngẫu nhiên và nhặt đúng vũ khí / đạn', (t) => {
  let start = 0;
  for (const [id, weight] of Object.entries(expected)) {
    const { room, players: [p] } = setupDuel(2);
    let calls = 0;
    const random = t.mock.method(Math, 'random', () => calls++ === 0 ? (start + weight / 2) / 100 : 0.99);
    launchAirdrop(room, { pos: { x: 0, z: 0 } });
    const pickup = [...room.pickups.values()][0];
    assert.equal(pickup.weapon, id);
    pickup.landsAt = 0;
    Object.assign(p, { x: pickup.x, z: pickup.z });
    tryPickup(room, p);
    assert.equal(p.weapon, id);
    assert.equal(p.ammo, WEAPONS[id].ammo?.[1] ?? null);
    assert.equal(room.pickups.size, 0);
    random.mock.restore();
    start += weight;
  }
});
