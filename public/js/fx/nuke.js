// Radio gọi bom hạt nhân đang diễn ra. Server báo 'nuke' (các mốc thời gian + đường bay) và 'nukeboom' lúc bom nổ; ở đây là phần nghe và nhìn:
// radio nói chuyện → còi báo động → máy bay bay qua → bom rơi (tiếng bom rít) → nổ (tiếng nổ, trắng xoá màn hình, mây nấm).
// Âm thanh chạy theo các mốc server gửi nên mọi người trong phòng nghe cùng lúc.
import { state } from '../state.js';
import { createAirplane } from '../entities/airplane.js';
import { createBomb } from '../entities/bomb.js';
import { playClip, loadClip } from '../audio/clips.js';
import { whiteout, clearWhiteout } from '../ui/nukeFlash.js';
import { spawnCloud, clearCloud } from './nukeCloud.js';
import { NUKE } from '../config.js';

const { sounds } = NUKE;
const SAFETY_MS = 15000; // quá mốc nổ chừng này mà chưa thấy 'nukeboom' (tin nhắn mất) thì bỏ

let active = null; // quả bom đang tới (từ lúc gọi tới lúc nổ / bị huỷ)
let plane = null; // máy bay: { airplane, dir, traveled }
let bomb = null;
let clips = []; // các tiếng đang phát, để dừng khi bị huỷ
let rumbleUntil = 0;
let boomClip = null;

// Tải trước các file âm thanh để không bị trễ ở những mốc quan trọng. Gọi sau khi âm thanh đã khởi tạo (Sfx.init).
export function preloadNukeSounds() {
  Object.values(sounds).forEach(({ file }) => loadClip(file));
}

const play = (name, options) => {
  const clip = playClip(sounds[name].file, sounds[name].gain, options);
  clips.push(clip);
  return clip;
};

// Có quả bom đang tới (chưa nổ) thì chưa gọi được quả khác.
export const nukeActive = () => active !== null && !active.exploded;

function removePlane() {
  plane?.airplane.root.dispose();
  plane = null;
}

function removeBomb() {
  bomb?.dispose();
  bomb = null;
}

// Bỏ máy bay, bom và các tiếng đang phát của quả bom trước (mây nấm và màn hình trắng thì để tự tan).
function stopCurrent() {
  clips.forEach((clip) => clip.stop(0.2));
  clips = [];
  active = null;
  removePlane();
  removeBomb();
}

// Dừng máy bay, bom và tiếng đang phát nhưng để mây nấm, màn trắng xoá và tiếng nổ tự tan (hết trận vì bom hạt nhân).
export const stopNuke = stopCurrent;

// Các mốc `radioIn`, `raidIn`, `planeIn`, `dropIn`, `boomIn` là mili giây kể từ bây giờ (âm = đã qua, với người vào phòng giữa chừng).
// Ba tiếng được hẹn giờ ngay trên đồng hồ âm thanh (audio/clips.js) chứ không đợi khung hình: người chơi để tab ở nền hay vào giữa chừng vẫn nghe đủ.
export function startNuke(m) {
  stopCurrent();
  active = { ...m, startedAt: performance.now(), exploded: false };
  play('radio', { delay: m.radioIn / 1000 });
  play('raid', { delay: m.raidIn / 1000, fadeAt: (m.dropIn - m.raidIn) / 1000, fade: NUKE.raidFadeMs / 1000 }); // nhỏ dần khi bom bắt đầu rơi
  play('fall', { delay: m.dropIn / 1000 });
}

// Vị trí máy bay sau `seconds` giây kể từ lúc vào sân: bay thẳng qua điểm thả theo hướng `heading`.
function planePosition(m, seconds) {
  const dir = { x: Math.sin(m.heading), z: Math.cos(m.heading) };
  const along = -m.approach + m.speed * seconds;
  return { x: m.at[0] + dir.x * along, y: m.at[1] + m.altitude, z: m.at[2] + dir.z * along, along };
}

function updatePlane(dt, t) {
  const m = active;
  if (!plane && !m.planeLeft && t >= m.planeIn && t < m.boomIn + SAFETY_MS) {
    plane = { airplane: createAirplane() };
    plane.airplane.root.rotation.y = m.heading;
  }
  if (!plane) return;
  const pos = planePosition(m, Math.max(0, t - m.planeIn) / 1000);
  plane.airplane.root.position.set(pos.x, pos.y, pos.z);
  plane.airplane.spin(dt);
  if (pos.along > m.approach + NUKE.planeLeaveMargin) {
    removePlane();
    m.planeLeft = true;
  }
}

// Bom rơi nhanh dần từ độ cao máy bay xuống mặt đất đúng lúc 'nukeboom' tới.
function updateBomb(t) {
  const m = active;
  if (!bomb && t >= m.dropIn && t < m.boomIn + SAFETY_MS) {
    bomb = createBomb();
  }
  if (!bomb) return;
  const fall = Math.min(1, (t - m.dropIn) / (m.boomIn - m.dropIn));
  bomb.position.set(m.at[0], m.at[1] + m.altitude * (1 - fall * fall), m.at[2]);
}

// Gọi mỗi khung hình.
export function updateNuke(dt) {
  if (performance.now() < rumbleUntil) {
    const left = (rumbleUntil - performance.now()) / 1000 / NUKE.rumble.seconds;
    state.shake = Math.max(state.shake, NUKE.rumble.power * left);
  }
  if (!active) return;
  const t = performance.now() - active.startedAt;
  if (!active.exploded) updateBomb(t);
  updatePlane(dt, t);
  if (!plane && ((active.exploded && active.planeLeft) || t > active.boomIn + SAFETY_MS)) stopCurrent(); // máy bay đã bay khỏi sân sau vụ nổ (hoặc tin nổ bị mất)
}

// Bom nổ (server báo, cùng lúc mọi người mất máu): tiếng nổ, trắng xoá màn hình, mây nấm và rung camera.
export function detonateNuke({ at }) {
  removeBomb();
  clips.forEach((clip) => clip.stop(0.05)); // tắt radio / còi / tiếng bom rít còn dở
  clips = [];
  if (active) active.exploded = true; // máy bay vẫn bay tiếp cho tới khi ra khỏi sân
  boomClip = playClip(sounds.boom.file, sounds.boom.gain); // không nằm trong `clips`: phải kêu hết dù máy bay bay đi rồi
  whiteout();
  spawnCloud(at);
  rumbleUntil = performance.now() + NUKE.rumble.seconds * 1000;
}

// Sang trận mới / về phòng chờ / hết trận: dừng và dọn mọi thứ của quả bom đang tới (kể cả mây nấm và màn hình trắng).
export function clearNuke() {
  stopCurrent();
  boomClip?.stop(0.2);
  boomClip = null;
  clearCloud();
  clearWhiteout();
  rumbleUntil = 0;
}
