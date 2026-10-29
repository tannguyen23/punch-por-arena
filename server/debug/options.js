const config = require('../config');
const { mapOptions } = require('../maps');
const { eventDebugInfo } = require('../game/events');
const { closeAllRooms } = require('../game/rooms');

// Tuỳ chọn của trang /admin-test (chỉ có khi chạy `npm run dev:debug`, xem http/debugRoutes.js): kiểm tra dữ liệu người dùng gửi, đổi cấu hình
// test của server khi đang chạy rồi xoá hết phòng để phòng mới theo đúng luật mới. File này không biết gì về từng sự kiện cụ thể: tên, số người,
// thông số thời gian và cách áp dụng do chính module sự kiện khai báo trong `debug` (xem dogEvent.js), nên thêm sự kiện mới không phải sửa ở đây.
// Đơn vị thời gian: giây. Các giá trị trong config được sửa tại chỗ; mọi nơi dùng chúng đều đọc lúc dùng.

const MAX_EVENTS = 20;
const GAP_SECONDS = 1.5; // nghỉ giữa hai sự kiện liên tiếp
const GENERAL = {
  first: { label: 'Bắt đầu sau', default: 2, min: 1, max: 600 },
  intro: { label: 'Đứng hình đọc luật', default: 2, min: 1, max: 60 },
  match: { min: 10, max: 3600 },
};

// Phần của một sự kiện gửi cho trang: bỏ hàm `apply`, chỉ giữ dữ liệu.
const publicInfo = ({ id, name, minPlayers, options, length }) => ({
  id,
  name,
  minPlayers,
  length,
  options: options.map(({ key, label, default: value, min, max }) => ({ key, label, default: value, min, max })),
});

// Những gì trang cần để dựng form.
function describe() {
  return {
    maps: [...mapOptions, { id: 'all', name: 'Xoay vòng tất cả' }],
    events: eventDebugInfo().map(publicInfo),
    general: GENERAL,
    defaultMap: 'default',
    matchRange: GENERAL.match,
    gapSeconds: GAP_SECONDS,
    tailSeconds: config.EVENTS.tailMs / 1000,
    maxEvents: MAX_EVENTS,
    maxPlayers: config.ROOM_MAX_PLAYERS,
  };
}

function ranged(value, label, { min, max }) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) throw new Error(`"${label}" phải từ ${min} đến ${max} giây`);
  return number;
}

// Trả về tuỳ chọn đã kiểm tra, hoặc ném Error có thông báo cho người dùng.
function sanitize(body) {
  if (typeof body !== 'object' || body === null) throw new Error('Dữ liệu không hợp lệ');
  const infos = eventDebugInfo();
  const events = Array.isArray(body.events) ? body.events : [];
  if (events.length === 0 || events.length > MAX_EVENTS || events.some((id) => !infos.some((info) => info.id === id))) {
    throw new Error(`Chọn từ 1 đến ${MAX_EVENTS} sự kiện hợp lệ`);
  }
  if (body.map !== 'all' && !mapOptions.some((map) => map.id === body.map)) throw new Error('Map không tồn tại');

  const chosen = infos.filter((info) => events.includes(info.id));
  const players = body.players === undefined ? Math.max(...chosen.map((info) => info.minPlayers)) : Number(body.players);
  if (!Number.isInteger(players) || players < 1 || players > config.ROOM_MAX_PLAYERS) {
    throw new Error(`Số người tối thiểu phải từ 1 đến ${config.ROOM_MAX_PLAYERS}`);
  }

  const settings = {}; // id sự kiện → { key → giây }, chỉ của các sự kiện được chọn
  for (const info of chosen) {
    settings[info.id] = {};
    for (const option of info.options) {
      settings[info.id][option.key] = ranged(body.settings?.[info.id]?.[option.key], `${info.name}: ${option.label}`, option);
    }
  }
  return {
    map: body.map,
    events,
    players,
    settings,
    match: ranged(body.match, 'Độ dài trận', GENERAL.match),
    first: ranged(body.first, GENERAL.first.label, GENERAL.first),
    intro: ranged(body.intro, GENERAL.intro.label, GENERAL.intro),
  };
}

// Áp tuỳ chọn và xoá hết phòng (các tab đang chơi bị ngắt; tab mở lại `/?autoplay=1` sẽ vào phòng mới).
function apply(body) {
  const o = sanitize(body);
  const { EVENTS, TEST } = config;
  Object.assign(TEST, { enabled: true, singleRoom: true, autoReady: true, map: o.map === 'all' ? null : o.map });
  config.MATCH_DURATION_MS = o.match * 1000;
  config.MIN_PLAYERS_TO_START = o.players;
  Object.assign(EVENTS, {
    firstMs: o.first * 1000,
    introMs: o.intro * 1000,
    only: null,
    sequence: o.events,
    count: o.events.length,
    testGapMs: GAP_SECONDS * 1000,
  });
  for (const info of eventDebugInfo()) {
    for (const option of info.options) {
      const value = o.settings[info.id]?.[option.key];
      if (value !== undefined) option.apply(value);
    }
  }
  closeAllRooms();
  return o;
}

module.exports = { describe, apply };
