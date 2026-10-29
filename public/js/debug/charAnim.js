import { engine, scene } from '../core/scene.js';
import { JUMP_AIR_TIME } from '../config.js';
import { loadSceneView, setCameraPreset } from './charScene.js';
import { createClipPlayer } from './clipPlayer.js';

const $ = (id) => document.getElementById(id);

// Khớp cooldown trong server/game/weapons.js để tốc độ animation giống lúc chơi.
const COOLDOWN = {
  fist: 0.35, sword: 0.35, dagger: 0.2, axe: 0.8, spear: 0.6, knife: 0.3,
  gauntlet: 0.9, thunder: 0.1, pistol: 0.3, ak47: 0.11, rocket: 1.2,
};

const loading = $('loading');
const gamePanel = $('gamePanel');
const clipPanel = $('clipPanel');
const weapon = $('weapon');
const repeat = $('repeat');
const speed = $('speed');
const speedLabel = $('speedLabel');
const pauseBtn = $('pause');
const clipSelect = $('clip');
const clipPlay = $('clipPlay');
const clipLoop = $('clipLoop');
const clipTime = $('clipTime');
const clipTimeLabel = $('clipTimeLabel');
const clipPrev = $('clipPrev');
const clipNext = $('clipNext');

let view = null;
let clips = null;
let mode = 'game';
let paused = false;
let timeScale = 1;
let jumpLeft = 0;
let lastAttack = null;
let repeatTimer = 0;

const cooldown = () => COOLDOWN[weapon.value] ?? 0.35;

function attack(hand) {
  if (!view) return;
  view.avatar.fists[hand].punch(cooldown());
  lastAttack = hand;
  repeatTimer = cooldown();
}

function action(name) {
  if (!view) return;
  switch (name) {
    case 'idle':
    case 'reset':
      view.avatar.resetAnimation();
      jumpLeft = 0;
      lastAttack = null;
      break;
    case 'punchL':
      attack('L');
      break;
    case 'punchR':
      attack('R');
      break;
    case 'jump':
      view.avatar.setAirborne(true, JUMP_AIR_TIME);
      jumpLeft = JUMP_AIR_TIME;
      break;
    case 'ko':
      view.avatar.knockOut();
      jumpLeft = 0;
      lastAttack = null;
      break;
  }
}

function syncClipUi() {
  if (!clips?.group) return;
  clipTime.max = clips.duration;
  clipTime.value = clips.time;
  clipTimeLabel.textContent = `${clips.time.toFixed(2)} / ${clips.duration.toFixed(2)}s`;
  clipPlay.textContent = clips.playing ? 'Tạm dừng' : 'Phát';
}

function setMode(next) {
  mode = next;
  view?.setMode(next);
  gamePanel.hidden = next !== 'game';
  clipPanel.hidden = next !== 'clip';
  if (next === 'clip' && clips) {
    if (!clips.group) clips.select(clipSelect.value);
    clips.setPlaying(true);
    syncClipUi();
  }
}

function togglePause() {
  paused = !paused;
  pauseBtn.textContent = paused ? 'Tiếp tục' : 'Tạm dừng';
}

function initUi() {
  for (const name of clips.names) clipSelect.add(new Option(name, name));
  clips.select(clipSelect.value);
  clips.setLoop(clipLoop.checked);
  clips.setPlaying(false);
  syncClipUi();

  weapon.addEventListener('change', () => {
    view.setWeapon(weapon.value);
    lastAttack = null;
  });
  repeat.addEventListener('change', () => {
    if (!repeat.checked) lastAttack = null;
  });
  speed.addEventListener('input', () => {
    timeScale = Number(speed.value);
    speedLabel.textContent = `${timeScale.toFixed(2)}×`;
  });
  pauseBtn.addEventListener('click', togglePause);

  for (const button of document.querySelectorAll('[data-action]')) {
    button.addEventListener('click', () => action(button.dataset.action));
  }
  for (const radio of document.querySelectorAll('input[name="mode"]')) {
    radio.addEventListener('change', () => setMode(radio.value));
  }
  for (const button of document.querySelectorAll('[data-cam]')) {
    button.addEventListener('click', () => setCameraPreset(view.camera, button.dataset.cam));
  }

  clipSelect.addEventListener('change', () => {
    clips.select(clipSelect.value);
    syncClipUi();
  });
  clipPlay.addEventListener('click', () => {
    clips.setPlaying(!clips.playing);
    syncClipUi();
  });
  clipLoop.addEventListener('change', () => clips.setLoop(clipLoop.checked));
  clipTime.addEventListener('input', () => {
    clips.setPlaying(false);
    clips.seek(Number(clipTime.value));
    syncClipUi();
  });
  clipPrev.addEventListener('click', () => {
    clips.setPlaying(false);
    clips.seek(clips.time - 1 / clips.fps);
    syncClipUi();
  });
  clipNext.addEventListener('click', () => {
    clips.setPlaying(false);
    clips.seek(clips.time + 1 / clips.fps);
    syncClipUi();
  });

  addEventListener('keydown', (e) => {
    if (e.target.matches('input, select, textarea')) return;
    if (e.code === 'Space') {
      e.preventDefault();
      togglePause();
      return;
    }
    if (mode !== 'game') return;
    const keys = { Digit1: 'punchL', Digit2: 'punchR', Digit3: 'jump', Digit4: 'ko', Digit5: 'reset', Digit0: 'idle' };
    if (keys[e.code]) action(keys[e.code]);
  });
}

async function main() {
  try {
    view = await loadSceneView($('c'));
    clips = createClipPlayer(view.groups);
    initUi();
    setMode('game');
    loading.hidden = true;
  } catch (err) {
    console.error(err);
    loading.textContent = `Không nạp được char.glb: ${err.message}`;
  }
}

engine.runRenderLoop(() => {
  const raw = Math.min(engine.getDeltaTime() / 1000, 0.1);
  const dt = raw * timeScale;
  if (view && !paused) {
    if (mode === 'game') {
      if (jumpLeft > 0) {
        jumpLeft -= dt;
        if (jumpLeft <= 0) view.avatar.setAirborne(false);
      }
      view.avatar.update(dt);
      if (repeat.checked && lastAttack) {
        repeatTimer -= dt;
        if (repeatTimer <= 0) attack(lastAttack);
      }
    } else if (clips) {
      clips.update(dt);
      syncClipUi();
    }
  }
  scene.render();
});

addEventListener('resize', () => engine.resize());
main();
