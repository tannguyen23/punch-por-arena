import { duelOf, isFighter } from '../core/duel.js';
import { teamName, teamAlive, duelTitle, duelInfo } from './duelText.js';
import { isBetFrameOpen } from './betFrame.js';
import { audienceHint } from './duelAudience.js';
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
  const winner = duel.roundWinner === null ? null : teamName(duel.roundWinner);
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

// Người xem: khung cược (betFrame.js) lo việc chọn; khi khung đã đóng thì nhắc phím và cược hiện tại, sau giai đoạn cược chỉ nhắc lại mình đã cược ai.
function betText(duel) {
  if (isFighter(duel)) return duel.stage === 'bet' ? 'Bạn là võ sĩ: chuẩn bị đánh!' : '';
  if (duel.stage === 'bet') {
    if (isBetFrameOpen()) return '';
    const mark = (i) => (duel.myBet === i ? '► ' : '   ');
    return [
      `${mark(0)}[1] ${teamName(0)} · ${duel.counts[0]} người cược`,
      `${mark(1)}[2] ${teamName(1)} · ${duel.counts[1]} người cược`,
      `Mỗi cược ${duel.stake} điểm: đúng +${duel.stake}, sai −${duel.stake}`,
    ].join('\n');
  }
  const bet = duel.myBet === null ? 'Bạn không cược' : `Bạn cược: ${teamName(duel.myBet)} (${duel.stake} điểm)`;
  return [bet, audienceHint(duel)].filter(Boolean).join('\n');
}

const setText = (el, text) => {
  if (el.textContent !== text) el.textContent = text;
};

// Gọi mỗi khung hình.
export function updateDuelHud() {
  const duel = duelOf();
  panel.hidden = !duel || duel.stage === 'intro'; // lúc đứng hình đã có bảng luật phủ cả màn hình
  if (!panel.hidden) {
    setText(scoreEl, `${duelTitle(duel)} · ${teamName(0)} ${teamAlive(duel.teams[0])} — ${teamAlive(duel.teams[1])} ${teamName(1)}`);
    setText(infoEl, duelInfo(duel));
    setText(betEl, betText(duel));
  }
  setText(bannerEl, banner && performance.now() < banner.until ? banner.text : '');
}
