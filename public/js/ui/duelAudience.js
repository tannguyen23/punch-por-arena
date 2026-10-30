import { state } from '../state.js';
import { duelOf, isFighter } from '../core/duel.js';

const overlay = document.createElement('div');
overlay.id = 'tomato-splat';
overlay.hidden = true;
overlay.setAttribute('aria-hidden', 'true');
document.body.append(overlay);

export function showTomatoSplat(ms) {
  state.tomatoUntil = performance.now() + ms;
}

export function updateTomatoSplat() {
  overlay.hidden = !duelOf() || !state.joined || performance.now() >= (state.tomatoUntil ?? 0);
}

export function audienceHint(duel) {
  if (isFighter(duel) || duel.stage !== 'fight' || !duel.audience) return '';
  const kit = duel.audience.kits.find((p) => p.id === state.myId);
  if (!kit) return '';
  const wait = Math.max(0, Math.ceil((kit.readyAt - performance.now()) / 1000));
  return `G: tiếp tế dao ×${kit.knives} · Chuột trái: cà chua ×${kit.tomatoes}${wait ? ` · Chờ ${wait}s` : ''}\nNét đứt: đường ném · Xanh: hợp lệ · Đỏ: dao ngoài võ đài · Vàng: hồi`;
}

const ERRORS = {
  unavailable: 'Chỉ khán giả còn sống mới được ném khi đang đánh.',
  bad_aim: 'Hướng ném không hợp lệ.',
  cooldown: 'Mỗi lần ném cách nhau 3 giây.',
  empty: 'Bạn đã dùng hết món này.',
  outside: 'Dao phải rơi trong võ đài — tới gần dây, ngắm vào sàn rồi ném lại.',
};

export const audienceError = (reason) => ERRORS[reason] ?? 'Không thể ném vật phẩm.';
