import { canvas } from './core/scene.js';
import { keys } from './core/keys.js';
import { state } from './state.js';
import { settings } from './settings.js';
import { look } from './player/localPlayer.js';
import { attack } from './player/attack.js';
import { setPauseVisible, onPauseClick } from './ui/hud.js';
import { copyRoomLink } from './ui/lobbyHud.js';
import { toggleReady } from './net/socket.js';
import * as Sfx from './audio/sfx.js';

const hasPointerLock = () => document.pointerLockElement === canvas;

export function initInput() {
  addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return; // đang gõ tên
    if (e.code === 'Space') e.preventDefault();
    keys.add(e.code);
    if (e.code === 'KeyM') Sfx.toggleMute();
    if (e.code === 'KeyF' && !e.repeat) toggleReady();
    if (e.code === 'KeyL' && !e.repeat) copyRoomLink();
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => {
    keys.clear();
    state.attacking = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  onPauseClick(() => canvas.requestPointerLock());
  document.addEventListener('pointerlockchange', () => {
    if (state.joined) setPauseVisible(!hasPointerLock());
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
  document.addEventListener('mouseup', () => {
    state.attacking = false;
  });
}
