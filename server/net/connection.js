const { MAX_HP, ROOM_MAX_PLAYERS, MIN_PLAYERS_TO_START } = require('../config');
const { currentMap } = require('../maps');
const { createPlayer, info } = require('../game/players');
const { createRoom, getRoom, removeIfEmpty } = require('../game/rooms');
const { randomFreePosition } = require('../game/spawn');
const { applyClientState } = require('../game/movement');
const { handlePunch } = require('../game/combat');
const { handleFire } = require('../game/shooting');
const { pickupView } = require('../game/pickups');
const { sanitizeLook, sanitizeName } = require('../game/sanitize');
const { weaponInfo } = require('../game/weapons');
const { matchInfo, setReady } = require('../game/match');
const { send, broadcast } = require('./messaging');

const ROOM_CODE = /^\d{3}$/;

// Tìm hoặc tạo phòng theo yêu cầu của client. Trả về { room } hoặc { error } (mã lỗi gửi lại cho client).
function resolveRoom(m) {
  if (m.create) {
    const room = createRoom();
    return room ? { room } : { error: 'server_full' };
  }
  const code = String(m.room ?? '').trim();
  if (!ROOM_CODE.test(code)) return { error: 'bad_code' };
  const room = getRoom(code);
  if (!room) return { error: 'room_not_found' };
  if (room.players.size >= ROOM_MAX_PLAYERS) return { error: 'room_full' };
  return { room };
}

function handleJoin(p, m) {
  if (p.joined) return;
  const { room, error } = resolveRoom(m);
  if (error) {
    send(p.ws, { t: 'error', reason: error }); // giữ kết nối để client thử lại với mã khác
    return;
  }

  p.name = sanitizeName(m.name, p.id);
  p.look = sanitizeLook(m.look);
  p.room = room;
  Object.assign(p, randomFreePosition(room));
  p.joined = true;
  room.players.set(p.id, p);
  send(p.ws, {
    t: 'welcome',
    id: p.id,
    x: p.x,
    z: p.z,
    map: currentMap,
    weapons: weaponInfo(),
    pickups: [...room.pickups.values()].map((pickup) => pickupView(pickup)),
    match: matchInfo(room),
    room: { code: room.code, max: ROOM_MAX_PLAYERS, minPlayers: MIN_PLAYERS_TO_START, created: Boolean(m.create) },
    maxHp: MAX_HP,
    players: [...room.players.values()].map(info),
  });
  for (const o of room.players.values()) {
    if (o !== p) send(o.ws, { t: 'join', ...info(p) });
  }
}

// Các tin nhắn chỉ được xử lý sau khi người chơi đã vào phòng.
const gameHandlers = {
  state: (p, m) => applyClientState(p.room, p, m),
  punch: (p, m) => (m.hand === 'L' || m.hand === 'R') && handlePunch(p.room, p, m.hand),
  fire: (p, m) => handleFire(p.room, p, m),
  ready: (p, m) => setReady(p.room, p, m.ready),
};

function handleConnection(ws) {
  const p = createPlayer(ws);

  ws.on('message', (raw) => {
    let m;
    try {
      m = JSON.parse(raw);
    } catch {
      return;
    }
    if (m.t === 'join') return handleJoin(p, m);
    if (!p.joined) return;
    gameHandlers[m.t]?.(p, m);
  });

  ws.on('close', () => {
    if (!p.joined) return;
    const { room } = p;
    room.players.delete(p.id);
    broadcast(room, { t: 'leave', id: p.id });
    removeIfEmpty(room);
  });
}

module.exports = { handleConnection };
