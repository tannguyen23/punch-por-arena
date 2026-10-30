const {
  MATCH_INTERMISSION_MS, MATCH_TICK_MS, COUNTDOWN_MS,
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
  room.nextAirdropAt = now + config.AIRDROP.firstMs;
  room.nextPotionAt = now + POTION.firstMs;
  startWeather(room, now);
  planEvents(room, now);
  broadcast(room, { t: 'start', duration: config.MATCH_DURATION_MS });
}

// Hết giờ: kết thúc trận, người nhiều điểm nhất thắng (client tự xét từ bảng xếp hạng). Đây là cách duy nhất trận kết thúc
// (bom hạt nhân chỉ là đòn không kích vào một vùng, xem nuke.js).
function endMatch(room) {
  clearProjectiles(room);
  room.phase = 'ended';
  room.endsAt = Date.now() + MATCH_INTERMISSION_MS;
  room.ranking = [...room.players.values()]
    .sort((a, b) => b.score - a.score)
    .map((p) => ({ id: p.id, name: p.name, kills: p.kills, score: p.score }));
  broadcast(room, { t: 'end', ranking: room.ranking, intermission: MATCH_INTERMISSION_MS });
}

// Hết giờ xem bảng xếp hạng: dọn sân, mọi người về phòng chờ và phải bấm F lại để chơi ván mới.
function returnToLobby(room) {
  const mapChanged = room.mapIds.length > 1;
  room.advanceMap(getMap);
  resetPlayers(room);
  clearPickups(room);
  clearProjectiles(room);
  room.ranking = [];
  enterLobby(room, { mapChanged });
}

// Người chơi bấm F (hoặc bấm lại để huỷ). Chỉ có tác dụng ở phòng chờ và lúc đếm ngược.
function setReady(room, p, ready) {
  if (room.phase !== 'lobby' && room.phase !== 'countdown') return;
  p.ready = Boolean(ready);
}

// Máy bay tiếp tế: phòng đông thì đợt tới dày hơn và mỗi đợt nhiều hòm hơn (mỗi hòm một máy bay riêng, công thức ở AIRDROP trong config.js)
// để ai cũng có cơ hội tranh vũ khí. Chỉ hòm đầu của đợt báo động (`quiet` cho các hòm sau) để tiếng còi không kêu dồn.
// Hòm không kịp chạm đất trước khi hết trận thì thôi không thả.
function runAirdrops(room, now) {
  if (now < room.nextAirdropAt) return;
  if (isPaused(room, 'airdrop')) { // sự kiện đang chạy ngưng thả hòm: dời hẹn để hết sự kiện mới tới lượt, không dồn một loạt hòm
    room.nextAirdropAt = now + config.EVENTS.retryMs;
    return;
  }
  const { baseIntervalMs, perPlayerMs, minIntervalMs, playersPerCrate, maxCrates } = config.AIRDROP;
  const n = Math.max(1, room.players.size);
  room.nextAirdropAt += Math.max(minIntervalMs, baseIntervalMs - perPlayerMs * (n - 1));
  if (now + AIRDROP_LEAD_MS >= room.endsAt) return;
  const crates = Math.min(maxCrates, Math.max(1, Math.ceil(n / playersPerCrate)));
  for (let i = 0; i < crates; i++) launchAirdrop(room, { quiet: i > 0 });
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
  return { phase: room.phase, timeLeft: timeLeft(room), ranking: room.ranking, weather: weatherView(room), event: eventView(room) };
}

function startMatchLoop() {
  return setInterval(() => {
    for (const room of allRooms()) tickRoom(room);
  }, MATCH_TICK_MS);
}

module.exports = { isPlaying, timeLeft, matchInfo, setReady, endMatch, tickRoom, startMatchLoop };
