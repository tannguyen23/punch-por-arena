const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRoom, getRoom } = require('../server/game/rooms');
const { Room } = require('../server/game/Room');
const { createPlayer } = require('../server/game/players');
const { assignHost } = require('../server/game/host');
const { leaveRoom } = require('../server/game/leave');
const { addBots } = require('../server/game/botRoster');
const { thinkBot } = require('../server/game/botBrain');
const { sanitizeBotCount, sanitizeBotLevel } = require('../server/game/sanitize');
const { getMap, defaultMapIds } = require('../server/maps');
const { ROOM_MAX_PLAYERS, DEFAULT_BOT_LEVEL, BOT_LEVELS } = require('../server/config');

const mapId = defaultMapIds[0];

function humanIn(room, name = 'Người') {
  const messages = [];
  const p = createPlayer({ OPEN: 1, readyState: 1, send: (data) => messages.push(JSON.parse(data)), close() {} });
  Object.assign(p, { name, room, joined: true, messages });
  room.players.set(p.id, p);
  return p;
}

test('Số bot màn tạo phòng gửi lên được kiểm tra: số nguyên, tối đa số chỗ còn lại sau người tạo', () => {
  assert.equal(sanitizeBotCount(5), 5);
  assert.equal(sanitizeBotCount(0), 0);
  assert.equal(sanitizeBotCount(999), ROOM_MAX_PLAYERS - 1);
  for (const bad of [-3, 2.5, '5', null, undefined, NaN, {}, [3]]) assert.equal(sanitizeBotCount(bad), 0, String(bad));
});

test('Bot là người chơi trong phòng, sẵn sàng sẵn, không bao giờ là chủ phòng; người thật cuối cùng đi thì bot và phòng đi theo', () => {
  const room = createRoom([mapId], getMap(mapId));
  const human = humanIn(room);
  assignHost(room, human);
  const added = addBots(room, 100);
  assert.equal(added, ROOM_MAX_PLAYERS - 1, 'bot chỉ lấp tới khi phòng đầy');
  assert.equal(room.players.size, ROOM_MAX_PLAYERS);
  const bots = [...room.players.values()].filter((p) => p.bot);
  assert.ok(bots.every((b) => b.ready && b.joined && /^Bot \d+$/.test(b.name) && b.look.shirt.startsWith('#')));
  assert.ok(bots.every((b) => b.botLevel === DEFAULT_BOT_LEVEL), 'không gửi mức thì dùng mức mặc định');
  assert.equal(new Set(bots.map((b) => b.id)).size, bots.length);
  assert.ok(human.messages.some((m) => m.t === 'join' && m.name === 'Bot 1'), 'người thật thấy bot vào');

  const second = humanIn(room, 'Người thứ hai'.slice(0, 5)); // phòng đã đầy nhưng test vẫn thêm trực tiếp được
  leaveRoom(human);
  assert.equal(room.ownerId, second.id, 'quyền chủ phòng sang người thật, không sang bot');
  leaveRoom(second);
  assert.equal(room.players.size, 0, 'bot đi theo người thật cuối cùng');
  assert.equal(getRoom(room.code), undefined, 'phòng được xoá');
});

test('Mức bot: chỉ nhận 1–3 (mặc định 2); bot nhận đúng mức và mức thấp yếu hơn mức cao', () => {
  assert.equal(sanitizeBotLevel(1), 1);
  assert.equal(sanitizeBotLevel(2), 2);
  assert.equal(sanitizeBotLevel(3), 3);
  for (const bad of [0, 4, 2.5, '2', null, undefined, NaN, {}, [1]]) assert.equal(sanitizeBotLevel(bad), DEFAULT_BOT_LEVEL, String(bad));

  const room = arena();
  addBots(room, 2, 1);
  assert.ok([...room.players.values()].every((b) => b.botLevel === 1));
  assert.ok(BOT_LEVELS[1].damageMult < BOT_LEVELS[3].damageMult, 'mức dễ đánh đau ít hơn');
  assert.ok(BOT_LEVELS[1].thinkMs > BOT_LEVELS[3].thinkMs, 'mức dễ phản ứng chậm hơn');
  assert.ok(BOT_LEVELS[1].pickupRange < BOT_LEVELS[3].pickupRange, 'mức dễ ít ham nhặt đồ hơn');
});

function arena() {
  const room = new Room('100', [mapId], getMap(mapId));
  room.mapData = { ...room.mapData, walls: [], props: [] };
  room.punchBlockers = [];
  room.phase = 'playing';
  return room;
}

test('Bot đuổi nhau và đánh nhau: có người mất máu hoặc bị hạ', (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000000 });
  const room = arena();
  addBots(room, 3);
  const bots = [...room.players.values()];
  bots.forEach((b, i) => Object.assign(b, { x: i * 8 - 8, z: 0, y: room.terrain.groundAt(i * 8 - 8, 0, 0) }));
  const start = bots.map((b) => ({ x: b.x, z: b.z }));
  for (let tick = 0; tick < 400; tick++) {
    t.mock.timers.tick(50);
    for (const b of bots) thinkBot(room, b, Date.now());
  }
  assert.ok(bots.some((b, i) => Math.hypot(b.x - start[i].x, b.z - start[i].z) > 1), 'bot phải di chuyển');
  assert.ok(bots.some((b) => b.hp < b.maxHp || b.dead || b.kills > 0), 'bot phải đánh trúng nhau');
});

test('Bot đứng yên ngoài trận (phòng chờ) và đi vòng qua tường chặn đường', (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000000 });
  const room = arena();
  addBots(room, 2);
  const [a, b] = [...room.players.values()];
  Object.assign(a, { x: 0, z: 0 });
  Object.assign(b, { x: 0, z: 14 });
  room.phase = 'lobby';
  for (let tick = 0; tick < 20; tick++) thinkBot(room, a, Date.now());
  assert.equal(a.z, 0, 'phòng chờ: đứng yên');

  room.phase = 'playing';
  room.mapData.walls = [{ x: 0, z: 7, w: 8, d: 1 }]; // tường chắn thẳng giữa hai bot
  let crossed = false;
  for (let tick = 0; tick < 400 && !crossed; tick++) {
    t.mock.timers.tick(50);
    thinkBot(room, a, Date.now());
    b.x = 0; b.z = 14; // giữ mục tiêu đứng yên
    if (a.z > 8.2) crossed = true;
    assert.ok(!(Math.abs(a.x) < 4 && Math.abs(a.z - 7) < 0.5), `bot lọt vào tường tại (${a.x.toFixed(2)}, ${a.z.toFixed(2)})`);
  }
  assert.ok(crossed, 'bot phải vòng qua tường');
});
