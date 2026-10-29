import { canvas } from './core/scene.js';
import { keys } from './core/keys.js';
import { state } from './state.js';
import { settings } from './settings.js';
import { look } from './player/localPlayer.js';
import { attack } from './player/attack.js';
import { selectSlot, dropWeapon } from './player/inventory.js';
import { callRadio } from './player/radioCall.js';
import { betOn } from './player/duelBet.js';
import { setPauseVisible, onPauseClick } from './ui/hud.js';
import { copyRoomLink } from './ui/lobbyHud.js';
import { isBetFrameOpen } from './ui/betFrame.js';
import { isPlayerListOpen, togglePlayerList } from './ui/playerList.js';
import { toggleReady } from './net/socket.js';
import * as Sfx from './audio/sfx.js';
import { FIST_SLOT } from './config.js';

const SLOT_KEY = /^Digit([1-9])$/; // Digit1 = ô đầu tiên ... ô cuối là tay không

const hasPointerLock = () => document.pointerLockElement === canvas;

export function initInput() {
  addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return; // đang gõ tên
    if (e.code === 'Space') e.preventDefault();
    keys.add(e.code);
    if (e.code === 'Tab') {
      e.preventDefault(); // không để Tab chuyển tiêu điểm khỏi trò chơi
      if (!e.repeat && !isBetFrameOpen()) togglePlayerList();
    }
    if (e.code === 'KeyM') Sfx.toggleMute();
    if (e.code === 'KeyF' && !e.repeat) toggleReady();
    if (e.code === 'KeyL' && !e.repeat) copyRoomLink();
    if (e.code === 'KeyG' && !e.repeat) dropWeapon();
    if (e.code === 'KeyR' && !e.repeat) callRadio();
    const slotKey = SLOT_KEY.exec(e.code);
    const slotIndex = slotKey ? Number(slotKey[1]) - 1 : -1;
    if (slotIndex >= 0 && !betOn(slotIndex) && slotIndex <= FIST_SLOT) selectSlot(slotIndex); // trong lúc cược solo phím 1 / 2 là chọn người cược
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => {
    keys.clear();
    state.attacking = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  onPauseClick(() => canvas.requestPointerLock());
  document.addEventListener('pointerlockchange', () => {
    if (state.joined) setPauseVisible(!hasPointerLock() && !isBetFrameOpen() && !isPlayerListOpen()); // khung cược / danh sách người chơi (chủ phòng) tự thả chuột ra để bấm
    if (!hasPointerLock()) state.attacking = false;
  });

  document.addEventListener('mousemove', (e) => {
    if (hasPointerLock()) look(e.movementX, e.movementY, settings.sensitivity);
  });
  canvas.addEventListener('mousedown', (e) => {
    if (!hasPointerLock()) return;
    state.attacking = e.button === 0 || e.button === 2;
    attack(e.button);
  });
  // ?autoplay vào thẳng trận mà không có cú click nào để khoá chuột: bấm vào sân là khoá lại như màn hình tạm dừng.
  canvas.addEventListener('click', () => {
    if (state.joined && !hasPointerLock()) canvas.requestPointerLock();
  });
  document.addEventListener('mouseup', () => {
    state.attacking = false;
  });
}
