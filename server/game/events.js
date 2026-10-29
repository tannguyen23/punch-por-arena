const { EVENTS, MATCH_DURATION_MS, MIN_PLAYERS_TO_START } = require('../config');
const { broadcast } = require('../net/messaging');
const dogEvent = require('./dogEvent');

// Sự kiện ngẫu nhiên trong trận. Đầu trận lên lịch 1–3 sự kiện rải đều (mỗi sự kiện một "ô" thời gian riêng, không chồng nhau);
// tới giờ thì bắt đầu: `introMs` đầu cả phòng đứng hình để đọc luật (restrictions.js), sau đó sự kiện chạy tới hết giờ hoặc có kết quả.
// Mỗi loại sự kiện là một module có `durationMs`, `begin`, `tick`, `onDown`, `finish` (xem dogEvent.js). Không require match.js
// (match.js require file này).

const KINDS = { dog: dogEvent };
const KIND_IDS = Object.keys(KINDS);

const pickKind = () => KIND_IDS[Math.floor(Math.random() * KIND_IDS.length)];
const lengthOf = (kind) => EVENTS.introMs + KINDS[kind].durationMs;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// Đầu trận: chia khoảng [firstMs, hết trận − tailMs] thành các ô bằng nhau, mỗi ô một sự kiện ở chỗ ngẫu nhiên.
// Ô nào không đủ chứa một sự kiện thì bớt số sự kiện (trận quá ngắn có thể không có sự kiện nào).
function planEvents(room, now) {
  room.event = null;
  room.frozenUntil = 0;
  const start = now + EVENTS.firstMs;
  const end = room.endsAt - EVENTS.tailMs;
  const longest = Math.max(...KIND_IDS.map(lengthOf));
  const wanted = clamp(Math.floor(MATCH_DURATION_MS / EVENTS.perMatchMs), 1, EVENTS.max);
  const count = Math.min(wanted, Math.floor((end - start) / longest));
  room.eventPlan = [];
  for (let i = 0; i < count; i++) {
    const slot = (end - start) / count;
    const kind = pickKind();
    room.eventPlan.push({ kind, at: start + slot * i + Math.random() * (slot - lengthOf(kind)) });
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
  };
}

// Còn người sống đủ để chơi và không có bom hạt nhân đang tới thì mới bắt đầu được.
function canStart(room) {
  const alive = [...room.players.values()].filter((p) => !p.dead).length;
  return !room.nuke && alive >= MIN_PLAYERS_TO_START;
}

function startEvent(room, kind, now) {
  const state = KINDS[kind].begin(room);
  if (!state) return;
  room.event = { kind, ...state, introEndsAt: now + EVENTS.introMs, endsAt: now + lengthOf(kind) };
  room.frozenUntil = room.event.introEndsAt;
  broadcast(room, { t: 'event', ...eventView(room, now) });
}

// Kết thúc sự kiện đang chạy: trả lại trạng thái bình thường cho người liên quan rồi báo kết quả cho cả phòng.
function endEvent(room, { reason, winner = null }) {
  const ev = room.event;
  if (!ev) return;
  KINDS[ev.kind].finish(room, ev);
  room.event = null;
  room.frozenUntil = 0;
  broadcast(room, { t: 'eventEnd', kind: ev.kind, reason, winnerId: winner?.id ?? null, winnerName: winner?.name ?? '', bounty: ev.bounty });
}

// Gọi mỗi nhịp của trận khi đang 'playing'.
function tickEvents(room, now) {
  const ev = room.event;
  if (ev) {
    const result = KINDS[ev.kind].tick(room, ev, now);
    if (result) endEvent(room, result);
    return;
  }
  const next = room.eventPlan[0];
  if (!next || now < next.at) return;
  if (now + lengthOf(next.kind) > room.endsAt) { // trễ hẹn quá, không kịp xong trước khi hết trận
    room.eventPlan.shift();
    return;
  }
  if (!canStart(room)) {
    next.at = now + EVENTS.retryMs;
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

// Hết trận / về phòng chờ: huỷ sự kiện đang chạy (không ai được thưởng) và bỏ lịch.
function clearEvents(room) {
  endEvent(room, { reason: 'cancelled' });
  room.eventPlan = [];
  room.frozenUntil = 0;
}

module.exports = { planEvents, tickEvents, onPlayerDown, clearEvents, eventView };
