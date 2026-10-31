import { canvas } from './core/scene.js';
import { keys } from './core/keys.js';
import { state } from './state.js';
import { settings } from './settings.js';
import { look } from './player/localPlayer.js';
import { attack, secondaryButton } from './player/attack.js';
import { togglePerf } from './ui/perfHud.js';
import { stopSkillAim } from './player/skillThrow.js';
import { releaseGrenadeAim, cancelGrenadeAim } from './player/grenadeAim.js';
import { selectSlot, dropWeapon } from './player/inventory.js';
import { callRadio } from './player/radioCall.js';
import { reloadWeapon } from './player/reload.js';
import { betOn } from './player/duelBet.js';
import { throwAudienceItem } from './player/duelAudience.js';
import { setPauseVisible, onPauseClick } from './ui/hud.js';
import { copyRoomLink } from './ui/lobbyHud.js';
import { isBetFrameOpen } from './ui/betFrame.js';
import { isPlayerListOpen, togglePlayerList } from './ui/playerList.js';
import { toggleReady } from './net/socket.js';
import * as Sfx from './audio/sfx.js';
import { FIST_SLOT, HOTBAR_SLOTS, TABLE_GAME, SPECTATOR } from './config.js';
import { joinNearbyTable } from './player/tableGame.js';
import { toggleRecording } from './ui/recording.js';

const SLOT_KEY = /^Digit([1-9])$/; // Digit1 = ô vũ khí đầu tiên; tay không không có ô riêng (bấm X để cất)

const hasPointerLock = () => document.pointerLockElement === canvas;

// Chrome có thể từ chối khoá chuột ngay sau khi thoát bằng Esc: bỏ qua lỗi, người chơi bấm lại.
const lockPointer = () => canvas.requestPointerLock()?.catch?.(() => {});

export function initInput() {
  addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return; // đang gõ tên
    if (e.code === 'F3') {
      e.preventDefault(); // F3 của trình duyệt là tìm kiếm
      if (!e.repeat) togglePerf();
      return;
    }
    if (state.tableGame) {
      if (e.code === 'KeyM' && !e.repeat) Sfx.toggleMute();
      return;
    }
    if (e.code === 'Space') e.preventDefault();
    keys.add(e.code);
    if (e.code === 'Tab') {
      e.preventDefault(); // không để Tab chuyển tiêu điểm khỏi trò chơi
      if (!e.repeat && !isBetFrameOpen()) togglePlayerList();
    }
    if (e.code === 'KeyM') Sfx.toggleMute();
    // F vừa là ngồi vào bàn cờ vừa là sẵn sàng ở phòng chờ: đứng gần bàn thì vào bàn, còn lại mới sẵn sàng.
    const joinedTable = e.code === TABLE_GAME.key && !e.repeat && !isBetFrameOpen() && !isPlayerListOpen() && joinNearbyTable();
    if (e.code === 'KeyF' && !e.repeat && !joinedTable) toggleReady();
    if (e.code === 'KeyL' && !e.repeat) copyRoomLink();
    // Khán giả: WASD / Space / Shift do player/spectatorCamera.js đọc, không đánh / nhặt / vứt / đổi ô.
    if (state.spectator) {
      if (e.code === SPECTATOR.key && !e.repeat && state.joined) toggleRecording();
      return;
    }
    if (e.code === 'KeyG' && !e.repeat && !throwAudienceItem('knife')) dropWeapon();
    if (e.code === 'KeyT' && !e.repeat) callRadio();
    if (e.code === 'KeyR' && !e.repeat) reloadWeapon();
    const slotKey = SLOT_KEY.exec(e.code);
    const slotIndex = slotKey ? Number(slotKey[1]) - 1 : -1;
    // Trong lúc cược solo phím 1 / 2 là chọn người cược. Bấm lại phím của ô đang cầm thì không làm gì; ô trống (hoặc X) là về tay không.
    if (slotIndex >= 0 && slotIndex < HOTBAR_SLOTS && !betOn(slotIndex) && !e.repeat) selectSlot(slotIndex);
    if (e.code === 'KeyX' && !e.repeat) selectSlot(FIST_SLOT);
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => {
    keys.clear();
    state.attacking = false;
    cancelGrenadeAim();
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  onPauseClick(lockPointer);
  document.addEventListener('pointerlockchange', () => {
    // Khán giả không hiện màn tạm dừng khi thả chuột để bấm nút quay / chỉnh bảng điều khiển.
    if (state.joined) setPauseVisible(!hasPointerLock() && !isBetFrameOpen() && !isPlayerListOpen() && !state.tableGame && !state.spectator); // các màn hình tương tác tự thả chuột
    if (!hasPointerLock()) state.attacking = false;
  });

  document.addEventListener('mousemove', (e) => {
    if (hasPointerLock()) look(e.movementX, e.movementY, settings.sensitivity);
  });
  canvas.addEventListener('mousedown', (e) => {
    if (!hasPointerLock() || state.spectator) return; // khán giả không đánh / ném
    if (e.button === 0 && throwAudienceItem('tomato')) return;
    if (e.button === 2) return secondaryButton(); // chuột phải không đánh: ngắm skill ném vũ khí, hoặc tung nhẹ lựu đạn
    state.attacking = e.button === 0; // chỉ chuột trái đánh / bắn / ném
    if (e.button === 0) attack(0);
  });
  // ?autoplay vào thẳng trận mà không có cú click nào để khoá chuột: bấm vào sân là khoá lại như màn hình tạm dừng.
  canvas.addEventListener('click', () => {
    if (state.joined && !state.tableGame && !hasPointerLock()) lockPointer();
  });
  document.addEventListener('mouseup', (e) => {
    if (state.spectator) return;
    if (e.button === 2) stopSkillAim();
    else state.attacking = false;
    releaseGrenadeAim(e.button); // lựu đạn: thả chuột mới ném
  });
}
