const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupDuel, beginDuel } = require('./helpers/duel');
const duel = require('../server/game/duelEvent');
const { DUEL, RESPAWN_MS, PLAYER_RADIUS } = require('../server/config');
const { applyDamage } = require('../server/game/damage');
const { handlePunch } = require('../server/game/combat');
const { clearEvents, tickEvents } = require('../server/game/events');
const { sameDuelTeam } = require('../server/game/restrictions');
const { leaderIndex } = require('../server/game/duelTeams');
const { tryPickup } = require('../server/game/pickups');
const { FIST_SLOT } = require('../server/game/inventory');

test('2–8 người chia cân hai đội; số lẻ dư một người cược, số chẵn bỏ cược; vị trí không chồng nhau', () => {
  for (let count = 2; count <= 8; count++) {
    const { room } = setupDuel(count);
    const ev = beginDuel(room);
    const size = Math.floor(count / 2);
    assert.deepEqual(ev.teams.map((ids) => ids.length), [size, size]);
    assert.equal(new Set(ev.fighters).size, size * 2);
    assert.equal(ev.stage, count % 2 ? 'bet' : 'fight');
    const { x, z, half } = room.mapData.ring;
    const fighters = ev.fighters.map((id) => room.players.get(id));
    for (const [i, p] of fighters.entries()) {
      assert.ok(Math.abs(p.x - x) <= half - DUEL.fighterMargin);
      assert.ok(Math.abs(p.z - z) <= half - DUEL.fighterMargin);
      assert.ok(fighters.slice(0, i).every((o) => Math.hypot(p.x - o.x, p.z - o.z) > PLAYER_RADIUS * 2));
    }
    const view = duel.view(room, ev, Date.now()).duel;
    assert.equal(view.teams[0].members.length, size);
    assert.ok(view.teams.flatMap((team) => team.members).every((p) => p.alive && p.name));
  }
});

test('Không gây sát thương đồng đội; đấm bỏ qua đồng đội trước mặt để tìm đúng đối phương', (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000000 });
  const { room } = setupDuel(4);
  const ev = beginDuel(room);
  const [a, ally] = ev.teams[0].map((id) => room.players.get(id));
  const enemy = room.players.get(ev.teams[1][0]);
  assert.ok(sameDuelTeam(room, a, ally));
  applyDamage(room, a, ally, 100);
  assert.equal(ally.hp, 100);
  Object.assign(a, { x: 0, z: 0, y: 0, yaw: 0 });
  Object.assign(ally, { x: 0, z: 0.6, y: 0 });
  Object.assign(enemy, { x: 0, z: 1.5, y: 0 });
  handlePunch(room, a, 'L');
  assert.equal(ally.hp, 100);
  assert.equal(enemy.hp, 90);
  room.pickups.set(1, { id: 1, weapon: 'pistol', ammo: 8, x: a.x, z: a.z, landsAt: 0 });
  tryPickup(room, a);
  assert.equal(a.weapon, 'fist');
  assert.equal(room.pickups.size, 1);
});

test('Gục nằm chờ; diệt cả đội mới thắng, mọi thành viên thắng +100 kể cả đã gục; trả cược đúng đội', (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000000 });
  const { room, players } = setupDuel(5);
  const ev = beginDuel(room);
  const spectator = players.find((p) => !ev.fighters.includes(p.id));
  duel.handleBet(room, spectator, 0);
  const [a, ally] = ev.teams[0].map((id) => room.players.get(id));
  const [b, enemy] = ev.teams[1].map((id) => room.players.get(id));
  applyDamage(room, b, a, 100);
  assert.equal(ev.stage, 'fight');
  assert.ok(a.dead);
  t.mock.timers.tick(RESPAWN_MS + 1);
  assert.ok(a.dead);
  assert.equal(b.kills, 0);
  applyDamage(room, ally, b, 100);
  assert.equal(ev.stage, 'fight');
  applyDamage(room, ally, enemy, 100);
  assert.equal(ev.stage, 'finish');
  assert.equal(ev.winnerTeam, 0);
  assert.equal(a.score, 0);
  t.mock.timers.tick(DUEL.finishMs);
  tickEvents(room, Date.now(), applyDamage);
  assert.equal(room.event, null);
  assert.deepEqual([a.score, ally.score, b.score, enemy.score, spectator.score], [100, 100, 0, 0, 50]);
  assert.ok(!a.dead && a.hp === a.maxHp);
  const result = spectator.messages.find((m) => m.t === 'eventEnd');
  assert.equal(result.winnerTeam, 0);
  assert.deepEqual(result.winnerIds, ev.teams[0]);
});

test('Huỷ khi một võ sĩ rời phòng, kể cả màn kết quả: không thưởng hay trừ cược', (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000000 });
  const { room } = setupDuel(4);
  const ev = beginDuel(room);
  ev.winnerTeam = 0;
  ev.stage = 'finish';
  room.players.delete(ev.teams[1][0]);
  tickEvents(room, Date.now(), applyDamage);
  assert.equal(room.event, null);
  assert.ok([...room.players.values()].every((p) => p.score === 0 && !p.dead));
  const next = beginDuel(room);
  next.winnerTeam = 0;
  clearEvents(room);
  assert.ok([...room.players.values()].every((p) => p.score === 0));
});

test('Vào võ đài cất túi tạm; kết thúc hay huỷ đều trả đúng vũ khí, đạn, băng đạn và ô đang cầm; người xem giữ nguyên', (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000000 });
  for (const ending of ['finish', 'cancel']) {
    const { room, players } = setupDuel(3);
    const snapshots = new Map(players.map((p, i) => {
      p.slots = [
        { weapon: 'pistol', ammo: 20 + i, magazine: 5 + i },
        null,
        { weapon: 'sword', ammo: null },
      ];
      p.activeSlot = i % 2 ? 2 : 0;
      p.reload = { slot: p.slots[p.activeSlot], endsAt: Date.now() + 1000 };
      return [p.id, { slots: p.slots.map((slot) => slot && { ...slot }), activeSlot: p.activeSlot }];
    }));

    const ev = beginDuel(room);
    const spectator = players.find((p) => !ev.fighters.includes(p.id));
    assert.deepEqual(spectator.slots, snapshots.get(spectator.id).slots);
    assert.equal(spectator.activeSlot, snapshots.get(spectator.id).activeSlot);
    for (const id of ev.fighters) {
      const p = room.players.get(id);
      assert.ok(p.slots.every((slot) => slot === null));
      assert.equal(p.activeSlot, FIST_SLOT);
      assert.equal(p.reload, null);
    }

    if (ending === 'finish') {
      ev.winnerTeam = 0;
      ev.stage = 'finish';
      ev.stageEndsAt = 0;
      tickEvents(room, Date.now(), applyDamage);
    } else {
      clearEvents(room);
    }

    for (const id of ev.fighters) {
      const p = room.players.get(id);
      const before = snapshots.get(id);
      assert.deepEqual(p.slots, before.slots);
      assert.equal(p.activeSlot, before.activeSlot);
      const held = before.slots[before.activeSlot];
      assert.equal(p.weapon, held.weapon);
      assert.equal(p.ammo, held.ammo);
      assert.equal(p.magazine, held.magazine ?? null);
      assert.equal(p.reload, null);
    }
    assert.deepEqual(spectator.slots, snapshots.get(spectator.id).slots);
    assert.equal(spectator.activeSlot, snapshots.get(spectator.id).activeSlot);
  }
});

test('Chống treo ưu tiên số người sống, rồi tổng máu; võ sĩ đang chờ hồi sinh không bị timer kéo khỏi võ đài', (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000000 });
  const { room, players } = setupDuel(4);
  applyDamage(room, null, players[0], 100);
  assert.ok(players[0].dead);
  const ev = beginDuel(room);
  assert.ok(ev.fighters.includes(players[0].id) && !players[0].dead);
  const pos = [players[0].x, players[0].z];
  t.mock.timers.tick(RESPAWN_MS);
  assert.deepEqual([players[0].x, players[0].z], pos);
  const [a, ally] = ev.teams[0].map((id) => room.players.get(id));
  const [b, enemy] = ev.teams[1].map((id) => room.players.get(id));
  a.hp = ally.hp = 1;
  b.dead = true;
  assert.equal(leaderIndex(room, ev), 0);
  a.dead = true;
  ally.hp = 40;
  enemy.hp = 50;
  assert.equal(leaderIndex(room, ev), 1);
  t.mock.timers.tick(DUEL.stallMs);
  duel.tick(room, ev, Date.now());
  assert.equal(ev.winnerTeam, 1);
});
