import { state, remotes } from '../state.js';
import { placeOnScreen } from '../core/screenPoint.js';
import { camera } from '../player/camera.js';
import { aimAxes } from '../player/aim.js';
import { DOG } from '../config.js';

// Chỉ báo con chó của sự kiện "hoá chó" cho mọi người trừ chính nó: luôn thấy chó đang ở đâu dù xa hay sau tường, kèm tiền thưởng ngay trên đầu
// để cả phòng đổ về đánh. Chó trong tầm nhìn thì bảng treo ngay trên đầu nó; ngoài tầm nhìn / sau lưng thì bảng dính ở mép màn hình kèm mũi tên chỉ
// hướng cần quay. Tên người chơi do họ tự nhập nên chỉ gán bằng textContent.
const root = document.getElementById('dog-tracker');
const tag = document.createElement('div');
tag.className = 'dog-tag';
const bounty = document.createElement('div');
bounty.className = 'dog-bounty';
const info = document.createElement('div');
info.className = 'dog-info';
tag.append(bounty, info);
const arrow = document.createElement('div');
arrow.className = 'dog-arrow';
root.append(arrow, tag);

let drawn = null;

// Gọi mỗi khung hình.
export function updateDogTracker() {
  const ev = state.event;
  const dog = ev?.kind === 'dog' && ev.targetId !== state.myId && state.alive ? remotes.get(ev.targetId) : null;
  root.hidden = !dog || dog.dead;
  if (root.hidden) return;

  const { position } = dog.root;
  const eye = camera.position;
  const dir = { x: position.x - eye.x, y: position.y + DOG.tagHeight - eye.y, z: position.z - eye.z };
  const at = placeOnScreen(dir, aimAxes(), camera.fov, innerWidth, innerHeight, DOG.trackerMargin);
  const distance = Math.round(Math.hypot(dir.x, dir.z));

  const signature = `${ev.bounty}|${ev.targetName}|${distance}`;
  if (signature !== drawn) {
    drawn = signature;
    bounty.textContent = `🐕 ${ev.bounty}đ`;
    info.textContent = `${ev.targetName} · ${distance}m`;
  }

  // Ngoài tầm nhìn: bảng lùi vào trong một đoạn so với mũi tên ở mép để hai thứ không đè nhau.
  const inset = at.onScreen ? 0 : DOG.trackerInset;
  const tagX = at.x - Math.cos(at.angle) * inset;
  const tagY = at.y - Math.sin(at.angle) * inset;
  tag.style.transform = `translate(${tagX}px, ${tagY}px) translate(-50%, -50%)`;
  arrow.hidden = at.onScreen;
  arrow.style.transform = `translate(${at.x}px, ${at.y}px) translate(-50%, -50%) rotate(${at.angle}rad)`;
}
