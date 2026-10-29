const {
  MATCH_INTERMISSION_MS, MATCH_TICK_MS, AIRDROP_FIRST_MS, AIRDROP_INTERVAL_MS, COUNTDOWN_MS,
  POTION, TEST,
} = require('../config');
const config = require('../config'); // MATCH_DURATION_MS và MIN_PLAYERS_TO_START đọc lúc dùng: /admin-test đổi được khi server đang chạy
const { broadcast } = require('../net/messaging');
const { AIRDROP_LEAD_MS, clearPickups, launchAirdrop } = require('./pickups');
const { clearRockets } = require('./rockets');
const { clearGrenades } = require('./grenades');
const { startWeather, stopWeather, tickWeather, weatherView } = require('./weather');
const { clearNuke } = require('./nuke');
const { clearIce } = require('./ice');
const { planEvents, tickEvents, clearEvents, eventView, isPaused } = require('./events');
const { regenerate } = require('./regen');
const { runPotionDrops } = require('./potionDrops');
const { tickPotions } = require('./potions');
const { respawn } = require('./spawn');
const { allRooms } = require('./rooms');
const { clearInventory } = require('./inventory');
const { getMap } = require('../maps');

// Vòng đời của một phòng (xem Room.js): lobby → countdown → playing → ended → lobby → ...
// Mọi hàm ở đây nhận `room`, các phòng không ảnh hưởng nhau.

// Bỏ mọi thứ đang bay / chờ nổ trên sân khi đổi pha (tên lửa, lựu đạn, vũng băng, bom hạt nhân, sét đã báo), cho trời tạnh
// và huỷ sự kiện đang chạy.
function clearProjectiles(room) {
  clearRockets(room);
  clearGrenades(room);
  clearIce(room);
  clearNuke(room);
  stopWeather(room);
  clearEvents(room);
}

const isPlaying = (room) => room.phase === 'playing';
const timeLeft = (room) => (room.phase === 'lobby' ? 0 : Math.max(0, room.endsAt - Date.now()));

// Đủ người tối thiểu và hơn `READY_RATIO` (một nửa) số người đã bấm F. Công thức này phải khớp `readyNeeded` ở public/js/ui/lobbyHud.js.
function enoughReady(room) {
  const ready = [...room.players.values()].filter((p) => p.ready).length;
  return room.players.size >= config.MIN_PLAYERS_TO_START && ready > room.players.size * config.READY_RATIO;
}

// Đưa mọi người về trạng thái đầu trận: hết kill, vũ khí về tay không, máu đầy, đứng chỗ mới, chưa sẵn sàng.
function resetPlayers(room) {
  for (const p of room.players.values()) {
    p.kills = 0;
    p.streak = 0;
    p.score = 0;
    p.dog = false;
    clearInventory(p);
    p.ready = false;
    respawn(room, p);
  }
}

function enterLobby(room, { cancelled = false, mapChanged = false } = {}) {
  room.phase = 'lobby';
  room.endsAt = 0;
  room.nextAirdropAt = 0;
  room.nextPotionAt = 0;
  broadcast(room, {
    t: 'lobby',
    cancelled,
    ...(mapChanged ? { map: room.mapData } : {}),
  });
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
  clearProjectiles(room);
  room.phase = 'playing';
  room.endsAt = now + config.MATCH_DURATION_MS;
  room.ranking = [];
  room.result = null;
  room.nextAirdropAt = now + AIRDROP_FIRST_MS;
  room.nextPotionAt = now + POTION.firstMs;
  startWeather(room, now);
  planEvents(room, now);
  broadcast(room, { t: 'start', duration: config.MATCH_DURATION_MS });
}

// Kết thúc trận. Hết giờ thì thắng là người nhiều kill nhất (client tự xét từ bảng xếp hạng); bom hạt nhân nổ (`winner` = người gọi bom,
// xem nuke.js) thì trận kết thúc ngay và người gọi bom thắng. `showIn`: client đợi ngần này ms mới hiện bảng kết quả (cho xem vụ nổ xong đã).
function endMatch(room, { winner = null, showIn = 0 } = {}) {
  clearProjectiles(room);
  room.phase = 'ended';
  room.endsAt = Date.now() + showIn + MATCH_INTERMISSION_MS;
  room.ranking = [...room.players.values()]
    .sort((a, b) => (b.id === winner?.id) - (a.id === winner?.id) || b.score - a.score) // người thắng bom đứng đầu bảng
    .map((p) => ({ id: p.id, name: p.name, kills: p.kills, score: p.score }));
  room.result = winner ? { reason: 'nuke', winnerId: winner.id, winnerName: winner.name, showIn } : { reason: 'time', showIn: 0 };
  broadcast(room, { t: 'end', ranking: room.ranking, intermission: showIn + MATCH_INTERMISSION_MS, result: room.result });
}

// Hết giờ xem bảng xếp hạng: dọn sân, mọi người về phòng chờ và phải bấm F lại để chơi ván mới.
function returnToLobby(room) {
  const mapChanged = room.mapIds.length > 1;
  room.advanceMap(getMap);
  resetPlayers(room);
  clearPickups(room);
  clearProjectiles(room);
  room.ranking = [];
  room.result = null;
  enterLobby(room, { mapChanged });
}

// Người chơi bấm F (hoặc bấm lại để huỷ). Chỉ có tác dụng ở phòng chờ và lúc đếm ngược.
function setReady(room, p, ready) {
  if (room.phase !== 'lobby' && room.phase !== 'countdown') return;
  p.ready = Boolean(ready);
}

// Cứ AIRDROP_INTERVAL_MS lại có một máy bay thả hòm tiếp tế. Hòm không kịp chạm đất trước khi hết trận thì thôi không thả.
function runAirdrops(room, now) {
  if (now < room.nextAirdropAt) return;
  if (isPaused(room, 'airdrop')) { // sự kiện đang chạy ngưng thả hòm: dời hẹn để hết sự kiện mới tới lượt, không dồn một loạt hòm
    room.nextAirdropAt = now + config.EVENTS.retryMs;
    return;
  }
  room.nextAirdropAt += AIRDROP_INTERVAL_MS;
  if (now + AIRDROP_LEAD_MS < room.endsAt) launchAirdrop(room);
}

function tickRoom(room) {
  const now = Date.now();
  switch (room.phase) {
    case 'lobby':
      if (TEST.autoReady) for (const p of room.players.values()) p.ready = true; // chế độ test: tự sẵn sàng, chơi lặp liên tục
      if (enoughReady(room)) beginCountdown(room);
      break;
    case 'countdown':
      // Có người bỏ sẵn sàng / thêm người mới / có người thoát làm không còn đủ người sẵn sàng: huỷ đếm ngược.
      if (TEST.autoReady) for (const p of room.players.values()) p.ready = true;
      if (!enoughReady(room)) enterLobby(room, { cancelled: true });
      else if (now >= room.endsAt) startMatch(room);
      break;
    case 'playing':
      if (now >= room.endsAt) {
        endMatch(room);
      } else {
        runAirdrops(room, now);
        runPotionDrops(room, now, isPaused(room, 'potion'));
        tickPotions(room, now);
        regenerate(room, now);
        tickWeather(room, now);
        tickEvents(room, now);
      }
      break;
    case 'ended':
      if (now >= room.endsAt) returnToLobby(room);
      break;
  }
}

// Trạng thái phòng cho người vừa vào: pha nào, còn bao lâu, bảng xếp hạng nếu đang nghỉ, đang bão không
// (hòm tiếp tế nằm trong 'pickups').
function matchInfo(room) {
  return { phase: room.phase, timeLeft: timeLeft(room), ranking: room.ranking, result: room.result, weather: weatherView(room), event: eventView(room) };
}

function startMatchLoop() {
  return setInterval(() => {
    for (const room of allRooms()) tickRoom(room);
  }, MATCH_TICK_MS);
}

module.exports = { isPlaying, timeLeft, matchInfo, setReady, endMatch, tickRoom, startMatchLoop };
