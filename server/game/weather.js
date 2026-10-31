const { STORM } = require('../config');
const { broadcast } = require('../net/messaging');
const { runLightning, clearLightning } = require('./lightning');
const { isPaused } = require('./events');

// Bão của một phòng: chỉ có khi đang 'playing'. Tới hẹn thì tung xác suất có bão; bão kéo dài một lúc rồi tạnh,
// trong lúc bão thì có sét (lightning.js). Mưa chỉ là hình ảnh/âm thanh phía client.

const randomBetween = ([min, max]) => min + Math.random() * (max - min);

// Gửi cho client (cả người vào giữa chừng): đang bão không và còn bao lâu.
function weatherView(room, now = Date.now()) {
  const { storm, endsAt } = room.weather;
  return { storm, left: storm ? Math.max(0, endsAt - now) : 0, fade: STORM.fadeMs };
}

function setStorm(room, storm, now) {
  room.weather.storm = storm;
  room.weather.endsAt = storm ? now + randomBetween(STORM.durationMs) : 0;
  room.weather.nextAt = storm ? room.weather.endsAt : now + STORM.gapMs;
  if (!storm) clearLightning(room);
  broadcast(room, { t: 'weather', ...weatherView(room, now) });
}

// Đầu trận: trời quang, hẹn lần đầu có thể có bão.
function startWeather(room, now) {
  room.weather = { storm: false, endsAt: 0, nextAt: now + STORM.firstMs };
  clearLightning(room);
}

// Hết trận / về phòng chờ: tạnh ngay (báo client nếu đang mưa), bỏ các tia sét đã báo mà chưa đánh.
function stopWeather(room) {
  if (room.weather.storm) setStorm(room, false, Date.now());
  room.weather = { storm: false, endsAt: 0, nextAt: 0 };
  clearLightning(room);
}

// Gọi mỗi nhịp của trận khi đang 'playing'.
function tickWeather(room, now) {
  const { weather } = room;
  if (weather.storm && now >= weather.endsAt) { // bão đang có vẫn tạnh tự nhiên, kể cả lúc sự kiện ngưng sét
    setStorm(room, false, now);
    return;
  }
  // Sự kiện solo ngưng sét: bỏ luôn tia đã báo (kể cả tia báo trước khi sự kiện bắt đầu) và không mở bão mới.
  if (isPaused(room, 'lightning')) {
    clearLightning(room);
    if (!weather.storm && now >= weather.nextAt) weather.nextAt = now + STORM.retryMs;
    return;
  }
  if (weather.storm) {
    runLightning(room, now);
    return;
  }
  if (now < weather.nextAt) return;
  if (Math.random() < STORM.chance) setStorm(room, true, now);
  else weather.nextAt = now + STORM.retryMs;
}

module.exports = { weatherView, startWeather, stopWeather, tickWeather };
