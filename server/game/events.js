const config = require('../config');
const { broadcast } = require('../net/messaging');
const dogEvent = require('./dogEvent');
const duelEvent = require('./duelEvent');
const tntEvent = require('./tntEvent');
const { clearTableGames } = require('./tableGames');

// Sự kiện ngẫu nhiên trong trận. Đầu trận lên lịch 1–3 sự kiện rải đều (mỗi sự kiện một "ô" thời gian riêng, không chồng nhau);
// tới giờ thì bắt đầu: `introMs` đầu cả phòng đứng hình để đọc luật (restrictions.js), sau đó sự kiện chạy tới hết giờ hoặc có kết quả.
// Mỗi phòng có thể giới hạn loại sự kiện (`room.allowedEvents`, màn tạo phòng gửi; null = tất cả, [] = không có sự kiện).
// Mỗi loại sự kiện là một module có `durationMs`, `begin`, `tick`, `onDown`, `finish` (xem dogEvent.js) và tuỳ chọn `view(room, ev, now)`
// (thêm trường vào tin 'event'), `absorbLethal(room, ev, target, attacker)` (nhận lấy cú đánh hạ gục, xem duelEvent.js) và `pauses` (mảng tên hoạt động
// nền tạm ngưng trong lúc sự kiện chạy, xem `isPaused`; 'airdrop', 'potion', 'lightning'). Không require match.js
// (match.js require file này).

const KINDS = { dog: dogEvent, duel: duelEvent, tnt: tntEvent };
const { EVENTS, TEST } = config; // các object này được sửa tại chỗ khi chạy /admin-test nên đọc thuộc tính lúc dùng, không sao chép giá trị

// Loại sự kiện được phép lúc này (đọc lại mỗi lần vì /admin-test đổi được khi server đang chạy).
// `room.allowedEvents`: null = tất cả (mặc định); mảng = chỉ những loại phòng cho phép (rỗng = không có sự kiện),
// do màn tạo phòng gửi lên (connection.js / sanitizeEventKinds).
function kindIds(room = null) {
  if (EVENTS.only && KINDS[EVENTS.only]) return [EVENTS.only];
  const requested = EVENTS.sequence.filter((kind) => KINDS[kind]);
  const base = requested.length > 0 ? requested : Object.keys(KINDS);
  return room?.allowedEvents ? base.filter((kind) => room.allowedEvents.includes(kind)) : base;
}

// Danh sách sự kiện cho màn tạo phòng: id, tên và số người tối thiểu (module tự khai báo trong `debug`).
const eventChoices = () => Object.entries(KINDS).map(([id, module]) => ({
  id,
  name: module.debug?.name ?? id,
  minPlayers: module.debug?.minPlayers ?? 1,
}));

const pickKind = (ids) => ids[Math.floor(Math.random() * ids.length)];
const lengthOf = (kind) => EVENTS.introMs + KINDS[kind].durationMs;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// Đầu trận: chia khoảng [firstMs, hết trận − tailMs] thành các ô bằng nhau, mỗi ô một sự kiện ở chỗ ngẫu nhiên.
// Ô nào không đủ chứa một sự kiện thì bớt số sự kiện (trận quá ngắn có thể không có sự kiện nào).
function planEvents(room, now) {
  room.event = null;
  room.frozenUntil = 0;
  const start = now + EVENTS.firstMs;
  const end = room.endsAt - EVENTS.tailMs;
  const ids = kindIds(room);
  const wanted = EVENTS.count ?? clamp(Math.floor(config.MATCH_DURATION_MS / EVENTS.perMatchMs), 1, EVENTS.max);
  room.eventPlan = [];
  if (ids.length === 0) return; // phòng tắt hết sự kiện

  // Chế độ test: chạy đúng thứ tự đã chọn, nối tiếp ngay sau `firstMs` và cách nhau `testGapMs`.
  if (TEST.enabled) {
    let at = start;
    for (let i = 0; i < wanted; i++) {
      const kind = ids[i % ids.length];
      if (at + lengthOf(kind) > end) break;
      room.eventPlan.push({ kind, at });
      at += lengthOf(kind) + EVENTS.testGapMs;
    }
    return;
  }

  const longest = Math.max(...ids.map(lengthOf));
  const count = Math.min(wanted, Math.floor((end - start) / longest));
  let previous = room.lastEventKind;
  for (let i = 0; i < count; i++) {
    const slot = (end - start) / count;
    const kind = pickKind(ids.length > 1 ? ids.filter((id) => id !== previous) : ids);
    room.eventPlan.push({ kind, at: start + slot * i + Math.random() * (slot - lengthOf(kind)) });
    previous = kind;
  }
}

// Gửi cho client (cả người vào giữa chừng): còn bao lâu là hết phần đứng hình / hết sự kiện. Null nếu không có sự kiện.
function eventView(room, now = Date.now()) {
  const ev = room.event;
  if (!ev) return null;
  const target = room.players.get(ev.targetId);
  return {
    kind: ev.kind,
    targetId: ev.targetId,
    targetName: target?.name ?? '',
    bounty: ev.bounty,
    introLeft: Math.max(0, ev.introEndsAt - now),
    left: Math.max(0, ev.endsAt - now),
    ...KINDS[ev.kind].view?.(room, ev, now), // phần riêng của từng loại (chó: kỹ năng thả shit; solo: võ sĩ, hiệp, cược)
  };
}

// Cảnh báo sắp có sự kiện, dùng cho người vào giữa 5 giây báo trước: { kind, in } hoặc null.
function eventWarnView(room, now = Date.now()) {
  const next = room.eventPlan?.[0];
  const left = next?.warned ? next.at - now : 0;
  return left > 0 ? { kind: next.kind, in: left } : null;
}

// Sự kiện này có thể bắt đầu với trạng thái phòng hiện tại không (võ đài cần ring + đủ 2 người không hoá chó).
function canRun(room, kind) {
  if (kind !== 'duel') return true;
  if (!room.mapData?.ring) return false;
  return [...room.players.values()].filter((p) => !p.dog).length >= 2;
}

// Còn người sống đủ để chơi và không có bom hạt nhân đang tới thì mới bắt đầu được.
function canStart(room) {
  const alive = [...room.players.values()].filter((p) => !p.dead).length;
  return !room.nuke && alive >= config.MIN_PLAYERS_TO_START;
}

function startEvent(room, kind, now) {
  const state = KINDS[kind].begin(room);
  if (!state) return;
  room.lastEventKind = kind;
  clearTableGames(room, 'event');
  room.event = { kind, ...state, introEndsAt: now + EVENTS.introMs, endsAt: now + lengthOf(kind) };
  room.frozenUntil = room.event.introEndsAt;
  broadcast(room, { t: 'event', ...eventView(room, now) });
}

// Kết thúc sự kiện đang chạy: trả lại trạng thái bình thường cho người liên quan rồi báo kết quả cho cả phòng.
function endEvent(room, { reason, winner = null, ...result }) {
  const ev = room.event;
  if (!ev) return;
  KINDS[ev.kind].finish(room, ev, reason);
  room.event = null;
  room.frozenUntil = 0;
  broadcast(room, { t: 'eventEnd', kind: ev.kind, reason, winnerId: winner?.id ?? null, winnerName: winner?.name ?? '', bounty: ev.bounty, ...result });
}

// Gọi mỗi nhịp khi đang 'playing'; truyền applyDamage từ match.js để tránh vòng damage → events → damage.
function tickEvents(room, now, dealDamage) {
  const ev = room.event;
  if (ev) {
    const result = KINDS[ev.kind].tick(room, ev, now, dealDamage);
    if (result) endEvent(room, result);
    return;
  }
  const next = room.eventPlan[0];
  if (!next) return;
  // Báo trước 5 giây để người chơi biết mà giữ vũ khí. Chốt loại thực tế ngay lúc báo (khác loại vừa chạy)
  // và bỏ mục nếu không kịp chạm mốc hết trận, tránh báo một sự kiện sẽ không diễn ra.
  if (!next.warned && now >= next.at - EVENTS.warnMs) {
    // Luôn báo đủ `warnMs` trước khi bắt đầu: hẹn đã tới (hoặc còn ít hơn `warnMs`) vì sự kiện trước chạy lố ô, vừa dời hẹn, chế độ test nối sự kiện
    // sát nhau... thì dời giờ bắt đầu ra sau, đừng để banner chỉ hiện 1–2 giây hay không kịp hiện.
    next.at = Math.max(next.at, now + EVENTS.warnMs);
    const ids = kindIds(room);
    if (!TEST.enabled && ids.length > 1 && next.kind === room.lastEventKind) {
      const choices = ids.filter((kind) => kind !== room.lastEventKind && canRun(room, kind) && next.at + lengthOf(kind) <= room.endsAt);
      if (choices.length === 0) {
        room.eventPlan.shift();
        return;
      }
      next.kind = pickKind(choices);
    }
    if (!canRun(room, next.kind) || next.at + lengthOf(next.kind) > room.endsAt) {
      room.eventPlan.shift();
      return;
    }
    next.warned = true;
    broadcast(room, { t: 'eventWarn', kind: next.kind, in: next.at - now });
  }
  if (now < next.at) return;
  // Sự kiện trong lịch có thể bị bỏ qua; đối chiếu lần chạy thật thay vì chỉ dựa vào hai ô kế nhau.
  const ids = kindIds(room);
  if (!TEST.enabled && ids.length > 1 && next.kind === room.lastEventKind) {
    const choices = ids.filter((kind) => kind !== room.lastEventKind && canRun(room, kind) && now + lengthOf(kind) <= room.endsAt);
    if (choices.length === 0) {
      room.eventPlan.shift();
      return;
    }
    next.kind = pickKind(choices);
  }
  if (!canRun(room, next.kind)) {
    room.eventPlan.shift();
    return;
  }
  if (now + lengthOf(next.kind) > room.endsAt) { // trễ hẹn quá, không kịp xong trước khi hết trận
    room.eventPlan.shift();
    return;
  }
  if (!canStart(room)) {
    next.at = now + Math.max(EVENTS.retryMs, EVENTS.warnMs);
    next.warned = false; // dời hẹn thì báo lại đủ 5 giây
    return;
  }
  room.eventPlan.shift();
  startEvent(room, next.kind, now);
}

// Có người bị hạ (gọi từ damage.js ngay sau khi chết): sự kiện đang chạy có thể kết thúc vì việc này.
function onPlayerDown(room, target, attacker) {
  const ev = room.event;
  if (!ev) return;
  const result = KINDS[ev.kind].onDown(room, ev, target, attacker);
  if (result) endEvent(room, result);
}

// Sự kiện đang chạy có yêu cầu tạm ngưng hoạt động nền `activity` không: 'airdrop' (máy bay thả hòm tiếp tế mới), 'potion' (thuốc mới rơi trên sân),
// 'lightning' (sét / bão mới, xem tickWeather trong weather.js).
// Chỉ chặn thứ MỚI xuất hiện; hòm đã bay / thuốc đã nằm trên sân vẫn ở nguyên (người chơi không nhặt được trong lúc sự kiện, cantAct). Thêm loại hoạt động
// mới thì match.js gọi hàm này ở chỗ lên lịch nó.
function isPaused(room, activity) {
  const ev = room.event;
  return Boolean(ev && KINDS[ev.kind].pauses?.includes(activity));
}

// Có người bị đánh về 0 máu (gọi từ damage.js trước khi tính là chết): sự kiện có thể nhận lấy cú đánh đó thay vì để người chơi chết thật.
// Trả về true nếu đã nhận.
function absorbLethal(room, target, attacker) {
  const ev = room.event;
  return Boolean(ev && KINDS[ev.kind].absorbLethal?.(room, ev, target, attacker));
}

// Hết trận / về phòng chờ: huỷ sự kiện đang chạy (không ai được thưởng) và bỏ lịch.
function clearEvents(room) {
  endEvent(room, { reason: 'cancelled' });
  room.eventPlan = [];
  room.frozenUntil = 0;
}

// Mô tả debug của mọi loại sự kiện đã đăng ký (trang /admin-test dựng form từ đây, xem `debug` trong dogEvent.js). Sự kiện chưa khai báo thì vẫn chọn được.
const eventDebugInfo = () => Object.entries(KINDS).map(([id, module]) => ({ name: id, minPlayers: 1, options: [], length: [], ...module.debug, id }));

module.exports = { eventDebugInfo, eventChoices, isPaused, planEvents, tickEvents, onPlayerDown, absorbLethal, clearEvents, eventView, eventWarnView };
