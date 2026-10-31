// Radio gọi bom hạt nhân đang diễn ra. Server báo 'nuke' (các điểm rơi, vùng nổ, mốc thời gian + đường bay) và 'nukeboom' lúc bom nổ;
// ở đây là phần nghe và nhìn: radio nói chuyện → còi báo động (hiện các vùng đỏ) → máy bay bay qua → nhiều quả bom rơi → nổ
// (tiếng nổ, trắng xoá màn hình, mây nấm ở từng điểm). Âm thanh chạy theo các mốc server gửi nên mọi người trong phòng nghe cùng lúc.
import { state } from '../state.js';
import { createAirplane } from '../entities/airplane.js';
import { createBomb } from '../entities/bomb.js';
import { playClip, loadClip } from '../audio/clips.js';
import { whiteout, clearWhiteout } from '../ui/nukeFlash.js';
import { spawnCloud, clearCloud } from './nukeCloud.js';
import { showNukeZones, updateNukeZone, clearNukeZone } from './nukeZone.js';
import { NUKE } from '../config.js';

const { sounds } = NUKE;
const SAFETY_MS = 15000; // quá mốc nổ chừng này mà chưa thấy 'nukeboom' (tin nhắn mất) thì bỏ

let active = null; // đợt bom đang tới (từ lúc gọi tới lúc nổ / bị huỷ)
let plane = null; // máy bay: { airplane, dir, traveled }
let bombs = []; // các quả bom đang rơi: [{ mesh, point }]
let clips = []; // các tiếng đang phát, để dừng khi bị huỷ
let rumbleUntil = 0;
let rumblePower = 0;
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

// Có đợt bom đang tới (chưa nổ) thì chưa gọi được đợt khác.
export const nukeActive = () => active !== null && !active.exploded;

function removePlane() {
  plane?.airplane.root.dispose();
  plane = null;
}

function removeBombs() {
  bombs.forEach((b) => b.mesh.dispose());
  bombs = [];
}

// Bỏ máy bay, bom, vùng đỏ và các tiếng đang phát của đợt trước (mây nấm và màn hình trắng thì để tự tan).
function stopCurrent() {
  clips.forEach((clip) => clip.stop(0.2));
  clips = [];
  active = null;
  removePlane();
  removeBombs();
  clearNukeZone();
}

// Các mốc `radioIn`, `raidIn`, `planeIn`, `dropIn`, `boomIn` là mili giây kể từ bây giờ (âm = đã qua, với người vào phòng giữa chừng).
// Ba tiếng được hẹn giờ ngay trên đồng hồ âm thanh (audio/clips.js) chứ không đợi khung hình: người chơi để tab ở nền hay vào giữa chừng vẫn nghe đủ.
export function startNuke(m) {
  stopCurrent();
  const points = m.points?.length ? m.points : [{ at: m.at, radius: m.radius, killRadius: m.killRadius }];
  active = { ...m, points, startedAt: performance.now(), exploded: false };
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

// Các quả bom rơi nhanh dần từ độ cao máy bay xuống mặt đất đúng lúc 'nukeboom' tới.
function updateBombs(t) {
  const m = active;
  if (!bombs.length && t >= m.dropIn && t < m.boomIn + SAFETY_MS) {
    bombs = m.points.map((point) => ({ mesh: createBomb(), point }));
  }
  if (!bombs.length) return;
  const fall = Math.min(1, (t - m.dropIn) / (m.boomIn - m.dropIn));
  for (const bomb of bombs) {
    const [x, y, z] = bomb.point.at;
    bomb.mesh.position.set(x, y + m.altitude * (1 - fall * fall), z);
  }
}

// Gọi mỗi khung hình.
export function updateNuke(dt) {
  if (performance.now() < rumbleUntil) {
    const left = (rumbleUntil - performance.now()) / 1000 / NUKE.rumble.seconds;
    state.shake = Math.max(state.shake, rumblePower * left);
  }
  if (!active) return;
  const t = performance.now() - active.startedAt;
  if (!active.exploded && !active.zoneShown && t >= active.raidIn) { // còi báo động kêu: hiện các vùng đỏ để mọi người kịp chạy
    active.zoneShown = true;
    showNukeZones(active.points);
  }
  updateNukeZone(dt);
  if (!active.exploded) updateBombs(t);
  updatePlane(dt, t);
  if (!plane && ((active.exploded && active.planeLeft) || t > active.boomIn + SAFETY_MS)) stopCurrent(); // máy bay đã bay khỏi sân sau vụ nổ (hoặc tin nổ bị mất)
}

// Độ mạnh của màn trắng xoá và rung (0–1) theo khoảng cách ngang từ mình tới điểm nổ (cùng cách đo với sát thương ở server):
// trong vùng nổ là đủ, xa dần tới `farRange` lần bán kính thì còn `minStrength` (ở xa vẫn thấy loé sáng, nhưng không bị mù).
function strengthAt(at, radius) {
  const d = Math.hypot(state.me.x - at[0], state.me.z - at[2]);
  const far = radius * NUKE.flash.farRange;
  if (!(radius > 0) || d <= radius) return 1;
  const k = Math.min(1, (d - radius) / (far - radius));
  return 1 - k * (1 - NUKE.minStrength);
}

// Bom nổ (server báo, cùng lúc người trong vùng mất máu): tiếng nổ, trắng xoá màn hình, mây nấm ở từng điểm và rung camera
// (nhẹ dần theo khoảng cách tới quả gần nhất).
export function detonateNuke({ at, radius, points }) {
  const list = points?.length ? points : [{ at, radius }];
  removeBombs();
  clearNukeZone();
  clips.forEach((clip) => clip.stop(0.05)); // tắt radio / còi / tiếng bom rít còn dở
  clips = [];
  if (active) active.exploded = true; // máy bay vẫn bay tiếp cho tới khi ra khỏi sân
  boomClip = playClip(sounds.boom.file, sounds.boom.gain); // không nằm trong `clips`: phải kêu hết dù máy bay bay đi rồi
  const strength = Math.max(...list.map((p) => strengthAt(p.at, p.radius ?? radius ?? active?.radius)));
  whiteout(strength);
  for (const point of list) spawnCloud(point.at);
  rumblePower = NUKE.rumble.power * strength;
  rumbleUntil = performance.now() + NUKE.rumble.seconds * 1000;
}

// Sang trận mới / về phòng chờ / hết trận: dừng và dọn mọi thứ của đợt bom đang tới (kể cả vùng đỏ, mây nấm và màn hình trắng).
export function clearNuke() {
  stopCurrent();
  boomClip?.stop(0.2);
  boomClip = null;
  clearCloud();
  clearWhiteout();
  rumbleUntil = 0;
}
