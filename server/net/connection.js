const config = require('../config');

const { MAX_HP, ROOM_MAX_PLAYERS, TEST } = config;
const { createPlayer, info } = require('../game/players');
const { createRoom, getRoom, allRooms } = require('../game/rooms');
const { randomFreePosition } = require('../game/spawn');
const { applyClientState } = require('../game/movement');
const { handlePunch } = require('../game/combat');
const { handleFire } = require('../game/shooting');
const { handleThrow } = require('../game/grenades');
const { pickupView } = require('../game/pickups');
const { iceView } = require('../game/ice');
const { nukeView } = require('../game/nuke');
const { handleDrop } = require('../game/drops');
const { handleRadioCall } = require('../game/radioCall');
const { startCharge, releaseCharge } = require('../game/bigPunch');
const { handlePoop } = require('../game/poop');
const { assignHost, handleKick } = require('../game/host');
const { leaveRoom } = require('../game/leave');
const { handleBet } = require('../game/duelEvent');
const { handleAudienceThrow } = require('../game/duelAudience');
const { handleReload } = require('../game/magazines');
const { selectSlot } = require('../game/inventory');
const { sanitizeLook, sanitizeName } = require('../game/sanitize');
const { weaponInfo } = require('../game/weapons');
const { potionInfo } = require('../game/potions');
const { matchInfo, setReady } = require('../game/match');
const { send } = require('./messaging');
const { mapOptions, defaultMapIds, getMap } = require('../maps');
const { handleTable, tableViews } = require('../game/tableGames');

const ROOM_CODE = /^\d{3}$/;

function selectedMaps(value) {
  if (value === undefined) return defaultMapIds;
  if (!Array.isArray(value) || value.length === 0) return null;
  const ids = [...new Set(value)];
  if (ids.length !== value.length || ids.some((id) => !getMap(id))) return null;
  return mapOptions.map(({ id }) => id).filter((id) => ids.includes(id));
}

// Tìm hoặc tạo phòng theo yêu cầu của client. Trả về { room } hoặc { error } (mã lỗi gửi lại cho client).
function resolveRoom(m) {
  if (m.create) {
    if (TEST.singleRoom) { // chế độ test: mọi tab "tạo phòng" đều vào chung phòng đầu tiên
      const shared = [...allRooms()].find((room) => room.players.size < ROOM_MAX_PLAYERS);
      if (shared) return { room: shared, created: false };
    }
    const forcedMap = TEST.map ? getMap(TEST.map) : null;
    if (TEST.map && !forcedMap) return { error: 'bad_maps' };
    const mapIds = forcedMap ? [forcedMap.data.id] : selectedMaps(m.mapIds);
    if (!mapIds) return { error: 'bad_maps' };
    const room = createRoom(mapIds, forcedMap ?? getMap(mapIds[0]));
    return room ? { room, created: true } : { error: 'server_full' };
  }
  const code = String(m.room ?? '').trim();
  if (!ROOM_CODE.test(code)) return { error: 'bad_code' };
  const room = getRoom(code);
  if (!room) return { error: 'room_not_found' };
  if (room.players.size >= ROOM_MAX_PLAYERS) return { error: 'room_full' };
  return { room, created: false };
}

function handleJoin(p, m) {
  if (p.joined || p.kicked) return;
  const name = sanitizeName(m.name, p.id);
  const look = sanitizeLook(m.look); // làm trước khi tạo phòng: dữ liệu hỏng mà làm ném lỗi thì không để lại phòng rỗng
  const { room, error, created } = resolveRoom(m);
  if (error) {
    send(p.ws, { t: 'error', reason: error }); // giữ kết nối để client thử lại với mã khác
    return;
  }

  p.name = name;
  p.look = look;
  p.room = room;
  if (created) assignHost(room, p);
  Object.assign(p, randomFreePosition(room));
  p.joined = true;
  p.ready = TEST.autoReady; // chế độ test: khỏi phải bấm F, kể cả khi vào giữa lúc đang đếm ngược
  room.players.set(p.id, p);
  send(p.ws, {
    t: 'welcome',
    id: p.id,
    x: p.x,
    z: p.z,
    map: room.mapData,
    weapons: weaponInfo(),
    potions: potionInfo(),
    tableRules: config.TABLE_GAME,
    tables: tableViews(room),
    pickups: [...room.pickups.values()].map((pickup) => pickupView(pickup)),
    ice: iceView(room),
    nuke: nukeView(room),
    match: matchInfo(room),
    room: {
      code: room.code,
      max: ROOM_MAX_PLAYERS,
      hostId: room.ownerId, // chủ phòng được kick người khác; đổi thì có tin 'host'
      readyRatio: config.READY_RATIO, // client tính "cần bao nhiêu người sẵn sàng" từ đây, không có bản sao riêng
      minPlayers: config.MIN_PLAYERS_TO_START, // đọc lúc dùng: /admin-test đổi được khi server đang chạy
      created: Boolean(created),
      mapId: room.mapData.id,
      mapName: room.mapData.name,
    },
    maxHp: MAX_HP,
    players: [...room.players.values()].map(info),
  });
  for (const o of room.players.values()) {
    if (o !== p) send(o.ws, { t: 'join', ...info(p) });
  }
}

// Các tin nhắn chỉ được xử lý sau khi người chơi đã vào phòng.
const gameHandlers = {
  table: (p, m) => handleTable(p.room, p, m),
  state: (p, m) => applyClientState(p.room, p, m),
  punch: (p, m) => (m.hand === 'L' || m.hand === 'R') && handlePunch(p.room, p, m.hand),
  fire: (p, m) => handleFire(p.room, p, m),
  reload: (p) => handleReload(p.room, p),
  throw: (p, m) => handleThrow(p.room, p, m),
  ready: (p, m) => setReady(p.room, p, m.ready),
  slot: (p, m) => selectSlot(p, m.slot), // selectSlot tự kiểm tra chỉ số ô
  drop: (p) => handleDrop(p.room, p),
  radio: (p) => handleRadioCall(p.room, p),
  poop: (p) => handlePoop(p.room, p),
  bet: (p, m) => handleBet(p.room, p, m.side),
  duelthrow: (p, m) => handleAudienceThrow(p.room, p, m),
  kick: (p, m) => handleKick(p.room, p, m.id),
  bigcharge: (p) => startCharge(p.room, p),
  bigrelease: (p) => releaseCharge(p.room, p),
};

function handleConnection(ws) {
  const p = createPlayer(ws);

  ws.on('error', () => {}); // khung WebSocket hỏng chỉ đóng kết nối đó; thiếu listener này thì Node ném lỗi và sập cả server

  ws.on('message', (raw) => {
    try {
      const m = JSON.parse(raw);
      if (m.t === 'join') return handleJoin(p, m);
      if (p.joined && Object.hasOwn(gameHandlers, m.t)) gameHandlers[m.t](p, m);
    } catch (err) {
      // Tin nhắn hỏng (không phải JSON, `null`, kiểu dữ liệu sai...) chỉ bị bỏ qua: một client không được làm sập cả server.
      if (!(err instanceof SyntaxError)) console.error('Lỗi khi xử lý tin nhắn:', err.message);
    }
  });

  ws.on('close', () => leaveRoom(p));
}

module.exports = { handleConnection };
