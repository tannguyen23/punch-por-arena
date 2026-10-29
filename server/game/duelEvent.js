const { DUEL } = require('../config');
const { broadcast } = require('../net/messaging');
const { stripInventory, clearInventory } = require('./inventory');
const { clearPotion } = require('./potions');
const { placeFighters, placeSpectators } = require('./duelRing');
const { countBets, settleBets } = require('./duelBets');

// Sự kiện "solo võ đài": hai người ngẫu nhiên bị nhốt trong võ đài đánh tay không, ai thắng `winsNeeded` hiệp trước thì thắng (BO3).
// Những người còn lại được đưa ra quanh võ đài, không đánh được (restrictions.js) và cược xem ai thắng (duelBets.js).
// Vòng đời nằm ở events.js; ở đây là các giai đoạn: intro (cả phòng đứng hình đọc luật) → bet → fight ⇄ break → finish.
// Mỗi hiệp đánh tới khi một người cạn máu, không giới hạn giờ. Riêng lưới chống treo: không ai trúng đòn suốt `DUEL.stallMs` (hai người đứng nhìn nhau)
// thì hiệp kết thúc và ai còn nhiều máu hơn thắng, nếu không cả phòng bị kẹt ở chế độ solo. Võ sĩ "gục" chỉ là nằm xuống, không mất điểm / vũ khí / hồi sinh chỗ khác.

const ROUNDS = DUEL.winsNeeded * 2 - 1;
// Thời lượng DỰ TÍNH (BO3 đánh đủ ba hiệp, mỗi hiệp `roundEstimateMs`) để xếp lịch sự kiện; hiệp thật không bị giới hạn nên có thể dài hơn.
// Đọc lúc dùng vì /admin-test đổi được các giai đoạn khi server đang chạy.
const maxDurationMs = () => DUEL.betMs + ROUNDS * DUEL.roundEstimateMs + (ROUNDS - 1) * DUEL.breakMs + DUEL.finishMs;

const fightersOf = (room, ev) => ev.fighters.map((id) => room.players.get(id));

// Gửi cho client (tin 'duel' và `event.duel`): "còn bao lâu" chứ không gửi mốc giờ, như mọi tin sự kiện.
function duelView(room, ev, now = Date.now()) {
  return {
    stage: ev.stage,
    round: ev.round,
    rounds: ROUNDS,
    winsNeeded: DUEL.winsNeeded,
    wins: ev.wins,
    roundWinner: ev.roundWinner, // võ sĩ (0 / 1) thắng hiệp vừa xong, null nếu chưa có
    fighters: ev.fighters.map((id) => ({ id, name: room.players.get(id)?.name ?? '' })),
    counts: countBets(ev),
    stake: DUEL.stake,
    prize: DUEL.prize,
    betMs: DUEL.betMs,
    fighterMargin: DUEL.fighterMargin, // hai số này để client tự chặn êm ở ranh giới (player/duelZone.js), khớp duelRing.js
    spectatorEdge: DUEL.spectatorEdge,
    stageLeft: ev.stageEndsAt ? Math.max(0, ev.stageEndsAt - now) : 0,
  };
}

const announce = (room, ev) => broadcast(room, { t: 'duel', duel: duelView(room, ev) });

function setStage(room, ev, stage, ms, now) {
  ev.stage = stage;
  ev.stageEndsAt = now + ms;
  announce(room, ev);
}

function pickFighters(room) {
  const pool = [...room.players.values()].filter((p) => !p.dead && !p.dog);
  if (pool.length < 2) return null;
  const first = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
  return [first, pool[Math.floor(Math.random() * pool.length)]];
}

// Trả về trạng thái sự kiện, hoặc null nếu map không có võ đài / không đủ hai người sống.
function begin(room) {
  const fighters = room.mapData.ring ? pickFighters(room) : null;
  if (!fighters) return null;
  for (const p of fighters) {
    clearPotion(p); // cùng thể hình, cùng máu
    stripInventory(p); // chỉ đấm tay không
  }
  const ids = fighters.map((p) => p.id);
  placeFighters(room, fighters);
  placeSpectators(room, ids);
  return { fighters: ids, bets: new Map(), stage: 'intro', stageEndsAt: 0, fighting: false, round: 0, wins: [0, 0], roundWinner: null, winnerId: null };
}

function startRound(room, ev, now) {
  ev.round++;
  ev.roundWinner = null;
  placeFighters(room, fightersOf(room, ev));
  ev.fighting = true;
  ev.roundStartedAt = now;
  setStage(room, ev, 'fight', 0, now); // không có hạn chót: hiệp xong khi có người cạn máu (absorbLethal)
}

function endRound(room, ev, winnerIdx, now) {
  ev.fighting = false;
  ev.roundWinner = winnerIdx;
  ev.wins[winnerIdx]++;
  if (ev.wins[winnerIdx] >= DUEL.winsNeeded) {
    ev.winnerId = ev.fighters[winnerIdx];
    setStage(room, ev, 'finish', DUEL.finishMs, now);
  } else {
    setStage(room, ev, 'break', DUEL.breakMs, now);
  }
}

// Hiệp bị bỏ dở (không ai trúng đòn): ai còn nhiều máu hơn thắng, bằng nhau thì bốc thăm.
function leaderIndex(fighters) {
  const [a, b] = fighters;
  if (a.hp === b.hp) return Math.floor(Math.random() * 2);
  return a.hp > b.hp ? 0 : 1;
}

// Lần cuối có người trúng đòn trong hiệp (applyDamage đặt `lastHurtAt` mỗi lần trúng) hoặc lúc hiệp bắt đầu: quá `stallMs` thì coi là treo.
const stalled = (room, ev, now) => now - Math.max(ev.roundStartedAt, ...fightersOf(room, ev).map((p) => p.lastHurtAt)) >= DUEL.stallMs;

const stages = {
  intro: (room, ev, now) => setStage(room, ev, 'bet', DUEL.betMs, now),
  bet: (room, ev, now) => now >= ev.stageEndsAt && startRound(room, ev, now),
  fight: (room, ev, now) => stalled(room, ev, now) && endRound(room, ev, leaderIndex(fightersOf(room, ev)), now),
  break: (room, ev, now) => now >= ev.stageEndsAt && startRound(room, ev, now),
  finish: (room, ev, now) => (now >= ev.stageEndsAt ? { reason: 'duel', winner: room.players.get(ev.winnerId) } : undefined),
};

// Mỗi nhịp: trả về kết quả nếu sự kiện phải kết thúc (có người thoát, xong trận), không thì undefined.
function tick(room, ev, now) {
  if (fightersOf(room, ev).some((p) => !p)) return { reason: 'left' };
  if (now < ev.introEndsAt) return undefined;
  return stages[ev.stage](room, ev, now);
}

// Võ sĩ bị đánh về 0 máu trong hiệp: thua hiệp (nằm xuống chứ không chết thật). Trả về true để damage.js bỏ qua phần chết thường.
function absorbLethal(room, ev, target) {
  const idx = ev.fighters.indexOf(target.id);
  if (idx < 0 || !ev.fighting) return false;
  target.dead = true; // client chạy hoạt ảnh ngã, hết hiệp thì được dựng dậy (placeFighters)
  endRound(room, ev, 1 - idx, Date.now());
  return true;
}

// Có người bị hạ ngoài luồng của võ đài (người xem chết vì sét...): không ảnh hưởng trận solo.
const onDown = () => undefined;

// Trả mọi thứ về như thường (cả khi sự kiện bị huỷ giữa chừng). Có người thắng thì thưởng và trả cược; bị huỷ thì không ai mất điểm.
function finish(room, ev) {
  for (const p of fightersOf(room, ev)) {
    if (!p) continue;
    p.dead = false;
    p.hp = p.maxHp;
    clearInventory(p);
  }
  const winner = room.players.get(ev.winnerId);
  if (!winner) return;
  winner.score += DUEL.prize;
  settleBets(room, ev, ev.fighters.indexOf(winner.id));
}

// Người xem đặt / đổi cược (tin 'bet'): chỉ trong giai đoạn cược, võ sĩ không được cược.
function handleBet(room, p, side) {
  const ev = room.event;
  if (ev?.kind !== 'duel' || ev.stage !== 'bet' || ev.fighters.includes(p.id) || (side !== 0 && side !== 1)) return;
  ev.bets.set(p.id, side);
  announce(room, ev);
}

const view = (room, ev, now) => ({ duel: duelView(room, ev, now) });

// Mô tả cho trang /admin-test (xem dogEvent.js). Cần ≥ 3 người: 2 võ sĩ + 1 người xem để thấy màn hình cược.
const seconds = (key, label, value, min, max, configKey = `${key}Ms`) => ({ key, label, default: value, min, max, apply: (n) => { DUEL[configKey] = n * 1000; } });
const debug = {
  name: 'Solo võ đài',
  minPlayers: 3,
  options: [
    seconds('bet', 'Cược', 10, 2, 120),
    seconds('round', 'Dự tính mỗi hiệp (xếp lịch)', 6, 3, 120, 'roundEstimateMs'),
    seconds('break', 'Nghỉ giữa hiệp', 2, 1, 30),
    seconds('finish', 'Xem kết quả', 2, 1, 30),
    seconds('stall', 'Hết hiệp nếu không ai trúng đòn', 10, 3, 120), // lưới chống treo, không tính vào thời lượng xếp lịch
  ],
  length: [{ key: 'bet', times: 1 }, { key: 'round', times: ROUNDS }, { key: 'break', times: ROUNDS - 1 }, { key: 'finish', times: 1 }],
};

module.exports = {
  get durationMs() { return maxDurationMs(); },
  begin, tick, onDown, finish, absorbLethal, view, handleBet, debug,
  pauses: ['airdrop', 'potion'], // đang solo thì không thả hòm tiếp tế và không rơi thuốc mới (người xem không nhặt được, võ sĩ chỉ đánh nhau tay không)
};
