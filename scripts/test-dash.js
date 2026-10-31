const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupDuel } = require('./helpers/duel');
const { handleDash, endGlideOnLanding } = require('../server/game/dash');
const { leapBounds } = require('../server/game/bigLeap');
const { DASH } = require('../server/config');

function fixture(t) {
  try {
    t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000000 });
  } catch {
    // đã bật từ lần dựng trước trong cùng test: dùng tiếp đồng hồ đó
  }
  const { room, players: [runner] } = setupDuel(2);
  room.terrain.heightAt = () => 0;
  room.terrain.groundAt = () => 0;
  room.terrain.isSupported = () => true;
  room.event = null;
  room.phase = 'playing';
  Object.assign(runner, { x: 0, y: 0, z: 0, yaw: 0, dashReadyAt: 0 });
  return { room, runner };
}

const dashOf = (p) => p.messages.findLast((m) => m.t === 'dash');

test('Nhìn ngang: lao thẳng đúng DASH.distance mét, không trọng lực, báo cho cả phòng', (t) => {
  const { room, runner } = fixture(t);
  handleDash(room, runner, { yaw: 0, pitch: 0 });
  const m = dashOf(runner);
  assert.ok(m, 'phải dash');
  assert.equal(m.gravity, 0);
  assert.ok(Math.abs(m.to[2] - DASH.distance) < 0.01 && Math.abs(m.to[0]) < 0.01);
  assert.equal(m.duration, Math.round((DASH.distance / DASH.speed) * 1000));
  assert.equal(m.cooldownMs, DASH.cooldownMs);
  const other = room.players.get([...room.players.keys()].find((id) => id !== runner.id));
  assert.ok(dashOf(other), 'người khác cũng nhận tin dash');
});

test('Đường bay khớp công thức chung: vị trí tại duration chính là điểm đến', (t) => {
  const { room, runner } = fixture(t);
  handleDash(room, runner, { yaw: 1, pitch: -0.4 });
  const m = dashOf(runner);
  const seconds = m.duration / 1000;
  m.from.forEach((v, i) => assert.ok(Math.abs(v + m.velocity[i] * seconds - m.to[i]) < 0.02));
  assert.ok(m.to[1] > 0, 'ngẩng lên thì bay lên');
});

test('Hồi chiêu: chưa hết thì dash lần hai bị bỏ qua, hết thì dash được', (t) => {
  const { room, runner } = fixture(t);
  handleDash(room, runner, { yaw: 0, pitch: 0 });
  t.mock.timers.tick(DASH.cooldownMs - 100);
  runner.messages.length = 0;
  handleDash(room, runner, { yaw: 0, pitch: 0 });
  assert.equal(dashOf(runner), undefined);
  t.mock.timers.tick(200);
  handleDash(room, runner, { yaw: 0, pitch: 0 });
  assert.ok(dashOf(runner));
});

test('Tường chặn đòn làm ngắn đường dash; sát mặt tường thì không dash và không tốn hồi chiêu', (t) => {
  const { room, runner } = fixture(t);
  room.punchBlockers = [{ x: 0, z: 3, w: 6, d: 0.2 }];
  handleDash(room, runner, { yaw: 0, pitch: 0 });
  assert.ok(dashOf(runner).to[2] < 2.9 - DASH.margin + 0.01, `dừng ở ${dashOf(runner).to[2]}`);
  const sticky = fixture(t);
  sticky.room.punchBlockers = [{ x: 0, z: 1, w: 6, d: 0.2 }];
  handleDash(sticky.room, sticky.runner, { yaw: 0, pitch: 0 });
  assert.equal(dashOf(sticky.runner), undefined);
  assert.equal(sticky.runner.dashReadyAt, 0);
});

test('Cúi xuống đất: điểm đến không chui xuống dưới mặt đất', (t) => {
  const { room, runner } = fixture(t);
  handleDash(room, runner, { yaw: 0, pitch: 1.2 });
  assert.ok(dashOf(runner).to[1] >= 0);
});

test('Bị chặn hành động (chó, choáng, chết, không phải pha chơi, đang gồng đấm) thì không dash', (t) => {
  const blocked = [
    (room, p) => { p.dog = true; },
    (room, p) => { p.stunnedUntil = Date.now() + 1000; },
    (room, p) => { p.dead = true; },
    (room) => { room.phase = 'lobby'; },
    (room, p) => { p.bigChargeAt = Date.now(); },
  ];
  for (const apply of blocked) {
    const { room, runner } = fixture(t);
    apply(room, runner);
    handleDash(room, runner, { yaw: 0, pitch: 0 });
    assert.equal(dashOf(runner), undefined);
  }
});

test('Tin hỏng (yaw / pitch không phải số) bị bỏ qua', (t) => {
  const { room, runner } = fixture(t);
  handleDash(room, runner, { yaw: 'a', pitch: 0 });
  handleDash(room, runner, null);
  assert.equal(dashOf(runner), undefined);
});

test('Trong lúc dash server nới giới hạn độ cao chân, hết giờ (cộng dư) thì trả về bình thường', (t) => {
  const { room, runner } = fixture(t);
  handleDash(room, runner, { yaw: 0, pitch: -0.8 });
  const bounds = leapBounds(runner);
  assert.ok(bounds && bounds.max >= dashOf(runner).to[1]);
  t.mock.timers.tick(DASH.glide.maxMs + 2000); // liệng dài nhất cộng dư
  assert.equal(leapBounds(runner), null);
});

test('Dash ngang trên đất thì không liệng; ngẩng lên giữa không trung thì liệng, thời gian theo độ cao / tốc độ rơi', (t) => {
  const { room, runner } = fixture(t);
  handleDash(room, runner, { yaw: 0, pitch: 0 });
  assert.equal(dashOf(runner).glideMs, 0);
  runner.dashReadyAt = 0;
  runner.leap = null;
  handleDash(room, runner, { yaw: 0, pitch: -0.6 });
  const m = dashOf(runner);
  const height = m.to[1];
  assert.equal(m.glideFall, DASH.glide.fallSpeed);
  assert.equal(m.glideEaseMs, DASH.glide.easeMs);
  assert.equal(m.glideMs, Math.min(DASH.glide.maxMs, Math.ceil((height / DASH.glide.fallSpeed) * 1000) + DASH.glide.slackMs));
  assert.ok(runner.leap.endsAt > runner.leap.flightEndsAt);
});

test('Đang liệng thì dash tiếp được (khi hết hồi chiêu); đang lao thì không', (t) => {
  const { room, runner } = fixture(t);
  handleDash(room, runner, { yaw: 0, pitch: -0.6 });
  const first = dashOf(runner);
  runner.dashReadyAt = 0; // bỏ qua hồi chiêu để kiểm tra riêng điều kiện bay
  runner.messages.length = 0;
  handleDash(room, runner, { yaw: 0, pitch: 0 });
  assert.equal(dashOf(runner), undefined, 'đang lao thì không dash chồng');
  t.mock.timers.tick(first.duration + 50);
  handleDash(room, runner, { yaw: 0, pitch: 0 });
  assert.ok(dashOf(runner), 'đã lao xong, đang liệng thì dash tiếp được');
});

test('Chạm đất khi đang liệng thì trả giới hạn độ cao về bình thường', (t) => {
  const { room, runner } = fixture(t);
  handleDash(room, runner, { yaw: 0, pitch: -0.6 });
  t.mock.timers.tick(dashOf(runner).duration + 100);
  endGlideOnLanding(runner, 0, 5);
  assert.ok(runner.leap, 'còn cao thì vẫn liệng');
  endGlideOnLanding(runner, 0, 0.1);
  assert.equal(runner.leap, null);
});
