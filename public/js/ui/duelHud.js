import { duelOf, isFighter } from '../core/duel.js';
import { isBetFrameOpen } from './betFrame.js';
import * as Sfx from '../audio/sfx.js';

// Bảng sự kiện solo võ đài (server/game/duelEvent.js): tỉ số, giai đoạn, và (với người xem) chỗ cược. Bố cục cố ý đơn giản.
// Tên người chơi do họ tự nhập nên chỉ gán bằng textContent.

const panel = document.getElementById('duel');
const scoreEl = panel.querySelector('.duel-score');
const infoEl = panel.querySelector('.duel-info');
const betEl = panel.querySelector('.duel-bet');
const bannerEl = document.getElementById('duel-banner');

const DEFAULT_BANNER_MS = 2500;
let banner = null; // { text, until }

// Dòng chữ to giữa màn hình (đổi giai đoạn, kết quả hiệp, kết quả cược).
export function showDuelBanner(text, ms = DEFAULT_BANNER_MS) {
  banner = { text, until: performance.now() + ms };
}

// Server báo trạng thái mới (net/duelHandlers.js): đổi giai đoạn thì báo chữ + tiếng.
export function onDuelChange(previous, duel) {
  if (!previous || previous.stage === duel.stage) return;
  const winner = duel.roundWinner === null ? null : duel.fighters[duel.roundWinner].name;
  if (duel.stage === 'bet') {
    showDuelBanner(isFighter(duel) ? 'CHUẨN BỊ!' : 'ĐẶT CƯỢC!');
    Sfx.beep(660, 0.7);
  } else if (duel.stage === 'fight') {
    showDuelBanner(`HIỆP ${duel.round} — ĐÁNH!`, 1800);
    Sfx.horn();
  } else if (winner) { // 'break' hoặc 'finish'
    showDuelBanner(`Hiệp ${duel.round}: ${winner} thắng!`);
    Sfx.beep(880, 0.8);
  }
}

const pips = (won, total) => '●'.repeat(won) + '○'.repeat(total - won);
const secondsLeft = (duel) => Math.max(0, Math.ceil((duel.stageEndsAt - performance.now()) / 1000));

function infoText(duel) {
  switch (duel.stage) {
    case 'bet': return `Đặt cược: còn ${secondsLeft(duel)}s`;
    case 'fight': return `Hiệp ${duel.round}/${duel.rounds} · đánh tới khi một người hết máu`;
    case 'break': return `Hiệp ${duel.round}: ${duel.fighters[duel.roundWinner].name} thắng · hiệp sau sau ${secondsLeft(duel)}s`;
    case 'finish': return `${duel.fighters[duel.roundWinner].name} thắng trận!`;
    default: return '';
  }
}

// Người xem: khung cược (betFrame.js) lo việc chọn; khi khung đã đóng thì nhắc phím và cược hiện tại, sau giai đoạn cược chỉ nhắc lại mình đã cược ai.
function betText(duel) {
  if (isFighter(duel)) return duel.stage === 'bet' ? 'Bạn là võ sĩ: chuẩn bị đánh!' : '';
  const [a, b] = duel.fighters;
  if (duel.stage === 'bet') {
    if (isBetFrameOpen()) return '';
    const mark = (i) => (duel.myBet === i ? '► ' : '   ');
    return [
      `${mark(0)}[1] ${a.name} · ${duel.counts[0]} người cược`,
      `${mark(1)}[2] ${b.name} · ${duel.counts[1]} người cược`,
      `Mỗi cược ${duel.stake} điểm: đúng +${duel.stake}, sai −${duel.stake}`,
    ].join('\n');
  }
  return duel.myBet === null ? 'Bạn không cược' : `Bạn cược: ${duel.fighters[duel.myBet].name} (${duel.stake} điểm)`;
}

const setText = (el, text) => {
  if (el.textContent !== text) el.textContent = text;
};

// Gọi mỗi khung hình.
export function updateDuelHud() {
  const duel = duelOf();
  panel.hidden = !duel || duel.stage === 'intro'; // lúc đứng hình đã có bảng luật phủ cả màn hình
  if (!panel.hidden) {
    const [a, b] = duel.fighters;
    setText(scoreEl, `${a.name} ${pips(duel.wins[0], duel.winsNeeded)}  VS  ${pips(duel.wins[1], duel.winsNeeded)} ${b.name}`);
    setText(infoEl, infoText(duel));
    setText(betEl, betText(duel));
  }
  setText(bannerEl, banner && performance.now() < banner.until ? banner.text : '');
}
