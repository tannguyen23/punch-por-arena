const {
  MATCH_DURATION_MS, MATCH_INTERMISSION_MS, MATCH_TICK_MS, AIRDROP_FIRST_MS, AIRDROP_INTERVAL_MS, COUNTDOWN_MS,
  MIN_PLAYERS_TO_START,
} = require('../config');
const { broadcast } = require('../net/messaging');
const { AIRDROP_LEAD_MS, clearPickups, launchAirdrop } = require('./pickups');
const { clearRockets } = require('./rockets');
const { regenerate } = require('./regen');
const { respawn } = require('./spawn');
const { allRooms } = require('./rooms');
const { clearInventory } = require('./inventory');

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
    clearInventory(p);
    p.ready = false;
    respawn(room, p);
  }
}

function enterLobby(room, { cancelled = false } = {}) {
  room.phase = 'lobby';
  room.endsAt = 0;
  room.nextAirdropAt = 0;
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
  clearRockets(room);
  room.phase = 'playing';
  room.endsAt = now + MATCH_DURATION_MS;
  room.ranking = [];
  room.nextAirdropAt = now + AIRDROP_FIRST_MS;
  broadcast(room, { t: 'start', duration: MATCH_DURATION_MS });
}

function endMatch(room) {
  clearRockets(room);
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
  clearRockets(room);
  room.ranking = [];
  enterLobby(room);
}

// Người chơi bấm F (hoặc bấm lại để huỷ). Chỉ có tác dụng ở phòng chờ và lúc đếm ngược.
function setReady(room, p, ready) {
  if (room.phase !== 'lobby' && room.phase !== 'countdown') return;
  p.ready = Boolean(ready);
}

// Cứ AIRDROP_INTERVAL_MS lại có một máy bay thả hòm tiếp tế. Hòm không kịp chạm đất trước khi hết trận thì thôi không thả.
function runAirdrops(room, now) {
  if (now < room.nextAirdropAt) return;
  room.nextAirdropAt += AIRDROP_INTERVAL_MS;
  if (now + AIRDROP_LEAD_MS < room.endsAt) launchAirdrop(room);
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
      if (now >= room.endsAt) {
        endMatch(room);
      } else {
        runAirdrops(room, now);
        regenerate(room, now);
      }
      break;
    case 'ended':
      if (now >= room.endsAt) returnToLobby(room);
      break;
  }
}

// Trạng thái phòng cho người vừa vào: pha nào, còn bao lâu, bảng xếp hạng nếu đang nghỉ (hòm tiếp tế nằm trong 'pickups').
function matchInfo(room) {
  return { phase: room.phase, timeLeft: timeLeft(room), ranking: room.ranking };
}

function startMatchLoop() {
  return setInterval(() => {
    for (const room of allRooms()) tickRoom(room);
  }, MATCH_TICK_MS);
}

module.exports = { isPlaying, timeLeft, matchInfo, setReady, tickRoom, startMatchLoop };
