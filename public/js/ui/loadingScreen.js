import { scene } from '../core/scene.js';
import { LOADING_TEXT } from './loadingText.js';

// Màn hình loading toàn màn hình (mẫu #event-intro, quy tắc 8): hiện từ lúc bấm vào / tạo phòng tới khi sân đã dựng xong và shader đã biên dịch xong,
// để người chơi không thấy sân dựng dở hoặc giật lúc biên dịch. Thanh chạy qua lại (không biết trước còn bao lâu nên không có phần trăm).
const el = document.getElementById('loading');
const title = document.createElement('div');
const status = document.createElement('div');
const note = document.createElement('div');
const bar = document.createElement('div');
const fill = document.createElement('div');
title.className = 'loading-title';
status.className = 'loading-status';
note.className = 'loading-note';
bar.className = 'loading-bar';
title.textContent = LOADING_TEXT.title;
note.textContent = LOADING_TEXT.note;
bar.append(fill);
el.append(title, status, bar, note);

const SLOW_MS = 6000; // chưa có phản hồi từ server sau ngần này thì báo kết nối chậm
const MIN_SHOWN_MS = 500; // hiện ít nhất ngần này cho khỏi loé một cái rồi tắt
const READY_TIMEOUT_MS = 10000; // chờ shader sẵn sàng tối đa ngần này rồi vào trận luôn (không để kẹt ở màn loading)

let shownAt = 0;
let slowTimer = null;
let finishing = false;

export function showLoading() {
  shownAt = performance.now();
  finishing = false;
  status.textContent = LOADING_TEXT.connecting;
  el.hidden = false;
  clearTimeout(slowTimer);
  slowTimer = setTimeout(() => { if (!el.hidden && !finishing) status.textContent = LOADING_TEXT.slow; }, SLOW_MS);
}

export function hideLoading() {
  clearTimeout(slowTimer);
  el.hidden = true;
  finishing = false;
}

// Server đã trả 'welcome' và sân đã dựng: đợi mọi mesh / material của scene sẵn sàng rồi mới ẩn màn loading.
export function finishLoading() {
  if (el.hidden || finishing) return;
  finishing = true;
  clearTimeout(slowTimer);
  status.textContent = LOADING_TEXT.preparing;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    setTimeout(hideLoading, Math.max(0, MIN_SHOWN_MS - (performance.now() - shownAt)));
  };
  scene.executeWhenReady(finish);
  setTimeout(finish, READY_TIMEOUT_MS);
}
