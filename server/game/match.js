const {
  MATCH_DURATION_MS, MATCH_INTERMISSION_MS, MATCH_TICK_MS, WAVE_WARNING_MS, WAVES, COUNTDOWN_MS, MIN_PLAYERS_TO_START,
} = require('../config');
const { broadcast } = require('../net/messaging');
const { clearPickups, dropWave } = require('./pickups');
const { respawn } = require('./spawn');
const { allRooms } = require('./rooms');
const { DEFAULT_WEAPON } = require('./weapons');

// Vòng đời của một phòng (xem Room.js): lobby → countdown → playing → ended → lobby → ...
// Mọi hàm ở đây nhận `room`, các phòng không ảnh hưởng nhau.

const isPlaying = (room) => room.phase === 'playing';
const timeLeft = (room) => (room.phase === 'lobby' ? 0 : Math.max(0, room.endsAt - Date.now()));

// Đủ người tối thiểu và ai cũng đã bấm F.
function allReady(room) {
  return room.players.size >= MIN_PLAYERS_TO_START && [...room.players.values()].every((p) => p.ready);
}

// Đưa mọi người về trạng thái đầu trận: hết kill, vũ khí về tay không, máu đầy, đứng chỗ mới, chưa sẵn sàng.
function resetPlayers(room) {
  for (const p of room.players.values()) {
    p.kills = 0;
    p.weapon = DEFAULT_WEAPON;
    p.ready = false;
    respawn(room, p);
  }
}

function enterLobby(room, { cancelled = false } = {}) {
  room.phase = 'lobby';
  room.endsAt = 0;
  room.waves = [];
  broadcast(room, { t: 'lobby', cancelled });
}

function beginCountdown(room) {
  room.phase = 'countdown';
  room.endsAt = Date.now() + COUNTDOWN_MS;
  broadcast(room, { t: 'countdown', duration: COUNTDOWN_MS });
}

function startMatch(room) {
  const now = Date.now();
  resetPlayers(room);
  clearPickups(room);
  room.phase = 'playing';
  room.endsAt = now + MATCH_DURATION_MS;
  room.ranking = [];
  room.waves = WAVES.map(({ at, count }) => ({ at: now + at * MATCH_DURATION_MS, count, announced: false, dropped: false }));
  broadcast(room, { t: 'start', duration: MATCH_DURATION_MS });
}

function endMatch(room) {
  room.phase = 'ended';
  room.endsAt = Date.now() + MATCH_INTERMISSION_MS;
  room.ranking = [...room.players.values()]
    .sort((a, b) => b.kills - a.kills)
    .map((p) => ({ id: p.id, name: p.name, kills: p.kills }));
  broadcast(room, { t: 'end', ranking: room.ranking, intermission: MATCH_INTERMISSION_MS });
}

// Hết giờ xem bảng xếp hạng: dọn sân, mọi người về phòng chờ và phải bấm F lại để chơi ván mới.
function returnToLobby(room) {
  resetPlayers(room);
  clearPickups(room);
  room.ranking = [];
  enterLobby(room);
}

// Người chơi bấm F (hoặc bấm lại để huỷ). Chỉ có tác dụng ở phòng chờ và lúc đếm ngược.
function setReady(room, p, ready) {
  if (room.phase !== 'lobby' && room.phase !== 'countdown') return;
  p.ready = Boolean(ready);
}

// Báo trước đợt vũ khí sắp rơi (đếm ngược trên màn hình mọi người) rồi thả khi đến giờ.
function runWaves(room, now) {
  for (const wave of room.waves) {
    if (!wave.announced && now >= wave.at - WAVE_WARNING_MS) {
      wave.announced = true;
      broadcast(room, { t: 'wave', in: Math.max(0, wave.at - now), count: wave.count });
    }
    if (!wave.dropped && now >= wave.at) {
      wave.dropped = true;
      dropWave(room, wave.count);
    }
  }
}

function tickRoom(room) {
  const now = Date.now();
  switch (room.phase) {
    case 'lobby':
      if (allReady(room)) beginCountdown(room);
      break;
    case 'countdown':
      // Có người bỏ sẵn sàng / thêm người mới / có người thoát làm thiếu người: huỷ đếm ngược.
      if (!allReady(room)) enterLobby(room, { cancelled: true });
      else if (now >= room.endsAt) startMatch(room);
      break;
    case 'playing':
      if (now >= room.endsAt) endMatch(room);
      else runWaves(room, now);
      break;
    case 'ended':
      if (now >= room.endsAt) returnToLobby(room);
      break;
  }
}

// Trạng thái phòng cho người vừa vào: pha nào, còn bao lâu, có đợt vũ khí nào đang đếm ngược, bảng xếp hạng nếu đang nghỉ.
function matchInfo(room) {
  const now = Date.now();
  const pending = room.waves.find((w) => w.announced && !w.dropped);
  return {
    phase: room.phase,
    timeLeft: timeLeft(room),
    wave: pending ? { in: Math.max(0, pending.at - now), count: pending.count } : null,
    ranking: room.ranking,
  };
}

function startMatchLoop() {
  return setInterval(() => {
    for (const room of allRooms()) tickRoom(room);
  }, MATCH_TICK_MS);
}

module.exports = { isPlaying, timeLeft, matchInfo, setReady, tickRoom, startMatchLoop };
