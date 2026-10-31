// Bão: trời tối lại, sương mù, mưa và tiếng mưa tăng dần / giảm dần theo `level`; sét đánh thì trời loé sáng.
// Có bão hay không do server quyết định (tin nhắn 'weather'), ở đây chỉ chuyển cảnh cho mượt.
import { scene, lights, SKY_COLOR } from '../core/scene.js';
import { state } from '../state.js';
import { WEATHER, LIGHTNING_FX } from '../config.js';
import { updateRain } from './rain.js';
import * as Sfx from '../audio/sfx.js';

let level = 0; // 0 trời quang → 1 bão to nhất
let target = 0;
let fadeS = 1; // giây để đổi từ 0 sang 1
let flash = 0; // ánh sáng loé thêm khi sét đánh, tắt dần
let rainSound = null;

// `fadeMs` 0 thì đổi ngay (người vào giữa lúc đang bão).
export function setStorm(storm, fadeMs = 0) {
  target = storm ? 1 : 0;
  fadeS = fadeMs / 1000;
  if (fadeMs <= 0) level = target;
}

export function skyFlash() {
  flash = LIGHTNING_FX.skyFlash;
}

// Chỉ ghi lại các thuộc tính của scene khi trời đổi (mỗi khung hình thì không đổi gì lúc trời quang), không cấp phát đối tượng mới.
// KHÔNG đổi scene.fogMode ở đây: xem core/scene.js.
let appliedLevel = -1;
let appliedFlash = -1;

function applySky() {
  if (level === appliedLevel && flash === appliedFlash) return;
  appliedLevel = level;
  appliedFlash = flash;
  const sky = SKY_COLOR.map((c, i) => c + (WEATHER.skyStorm[i] - c) * level);
  const bright = flash / LIGHTNING_FX.skyFlash;
  scene.clearColor.set(...sky.map((c) => c + (1 - c) * bright * 0.6), 1);
  const dim = 1 - (1 - WEATHER.lightMult) * level;
  lights.sky.intensity = lights.base.sky * dim + flash;
  lights.sun.intensity = lights.base.sun * dim;
  scene.fogDensity = state.spectator ? 0 : WEATHER.fogDensity * level; // camera khán giả ở trên cao: sương dày sẽ che kín cả sân
  scene.fogColor.set(...sky);
}

function updateRainSound() {
  if (level > 0 && !rainSound) rainSound = Sfx.rainLoop(); // chưa có âm thanh (chưa bấm vào trang) thì là bản câm
  rainSound?.set(WEATHER.rainVolume * level);
  if (level <= 0 && target === 0 && rainSound) {
    rainSound.stop();
    rainSound = null;
  }
}

export function updateWeather(dt) {
  const step = fadeS > 0 ? dt / fadeS : 1;
  level = target > level ? Math.min(target, level + step) : Math.max(target, level - step);
  flash = Math.max(0, flash - (dt / LIGHTNING_FX.skyFlashLife) * LIGHTNING_FX.skyFlash);
  applySky();
  updateRain(level);
  updateRainSound();
}
