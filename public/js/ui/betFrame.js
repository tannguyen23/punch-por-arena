import { canvas } from '../core/scene.js';
import { duelOf, isFighter } from '../core/duel.js';
import { setPauseVisible } from './hud.js';

// Màn hình cược toàn màn hình của người xem trong sự kiện solo: phủ kín màn hình suốt giai đoạn cược và buộc chọn một trong hai võ sĩ
// (bấm chuột hoặc phím 1 / 2); chưa chọn thì không có nút bỏ qua. Chọn rồi mới có nút "Vào xem trận" để quay lại sân; không bấm thì
// màn hình tự đóng khi hết giờ cược. Chuột đang bị khoá để chơi nên màn hình tự mở khoá. Tên người chơi do họ tự nhập nên chỉ gán bằng textContent.

const frame = document.getElementById('bet-frame');
const timeEl = frame.querySelector('.bet-time');
const barEl = frame.querySelector('.bet-bar > div');
const noteEl = frame.querySelector('.bet-note');
const watchEl = frame.querySelector('.bet-watch');
const options = [...frame.querySelectorAll('.bet-option')];

let choose = () => {};
let dismissed = false; // đã chọn và bấm "Vào xem trận": không mở lại tới hết giai đoạn cược

// `onChoose(side)`: gọi khi bấm chọn một võ sĩ (player/duelBet.js gửi lên server).
export function initBetFrame(onChoose) {
  choose = onChoose;
}

export const isBetFrameOpen = () => !frame.hidden;

options.forEach((button, side) => button.addEventListener('click', () => choose(side)));

watchEl.addEventListener('click', () => {
  dismissed = true;
  canvas.requestPointerLock(); // bấm chuột là cử chỉ của người dùng nên được khoá lại ngay
});

const setText = (el, text) => {
  if (el.textContent !== text) el.textContent = text;
};

function render(duel) {
  const left = Math.max(0, duel.stageEndsAt - performance.now());
  setText(timeEl, `Còn ${Math.ceil(left / 1000)}s`);
  barEl.style.width = `${Math.min(100, (left / duel.betMs) * 100)}%`;
  setText(noteEl, `Mỗi cược ${duel.stake} điểm: đúng +${duel.stake}, sai −${duel.stake} · bấm bên kia để đổi ý`);
  options.forEach((button, side) => {
    const chosen = duel.myBet === side;
    setText(button.querySelector('.bet-name'), duel.fighters[side].name);
    setText(button.querySelector('.bet-count'), `${duel.counts[side]} người cược`);
    setText(button.querySelector('.bet-cta'), chosen ? '✓ ĐÃ CƯỢC' : 'BẤM ĐỂ CHỌN');
    button.classList.toggle('chosen', chosen);
  });
  watchEl.hidden = duel.myBet === null;
}

// Gọi mỗi khung hình.
export function updateBetFrame() {
  const duel = duelOf();
  const betting = duel !== null && duel.stage === 'bet' && !isFighter(duel);
  if (!betting) dismissed = false;
  const open = betting && !dismissed;
  if (open) render(duel);
  if (open === !frame.hidden) return;
  frame.hidden = !open;
  if (open) {
    document.exitPointerLock(); // thả chuột ra để bấm được
  } else if (!dismissed && document.pointerLockElement !== canvas) {
    setPauseVisible(true); // hết giờ cược mà chưa khoá chuột lại: như lúc tạm dừng, bấm để chơi tiếp
  }
}
