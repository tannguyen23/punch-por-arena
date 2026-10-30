import { keys } from '../core/keys.js';
import { state } from '../state.js';
import { settings } from '../settings.js';
import { resolveCollisions } from './collision.js';
import { eyeHeight } from './aim.js';
import { camera } from './camera.js';
import { updateViewmodel } from './viewmodel.js';
import { updateSprint } from './sprint.js';
import { slideVelocity, settleSlide, resetSlide } from './iceSlide.js';
import { groundAt, waterLevel } from '../core/terrain.js';
import { isImmobile, isStunned } from '../core/freeze.js';
import { tntSpeedMult } from '../core/tnt.js';
import { sizeOf, speedOf } from '../core/bodySize.js';
import { updateBodyView } from './bodyView.js';
import { applyKnockback, resetKnockback } from './knockback.js';
import { stinkSpeedMult } from './stink.js';
import * as Sfx from '../audio/sfx.js';
import {
  MOVE_SPEED, SPRINT_MULT, SPRINT_CAMERA, CROUCH_MULT, JUMP_SPEED, GRAVITY, WATER_SPEED_MULT, GROUND_STICK, PITCH_LIMIT, DOG, POTION,
} from '../config.js';

export function look(movementX, movementY, sensitivity) {
  state.yaw += movementX * sensitivity;
  state.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, state.pitch + movementY * sensitivity));
}

function applyMovement(dt) {
  const fwd = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
  const strafe = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
  const len = Math.hypot(fwd, strafe) || 1;
  const moving = fwd !== 0 || strafe !== 0;
  const sin = Math.sin(state.yaw);
  const cos = Math.cos(state.yaw);

  state.crouching = keys.has('KeyC') && !state.dog; // chó không ngồi
  updateSprint(moving && !state.crouching && (keys.has('ShiftLeft') || keys.has('ShiftRight')), dt);
  const speed = MOVE_SPEED * (state.sprinting ? SPRINT_MULT : state.crouching ? CROUCH_MULT : 1) * (isWading() ? WATER_SPEED_MULT : 1)
    * (state.dog ? DOG.speedMult : 1) * speedOf(state.potion?.id) * stinkSpeedMult() * tntSpeedMult();
  const scale = moving ? speed / len : 0;
  const { x, z } = slideVelocity((sin * fwd + cos * strafe) * scale, (cos * fwd - sin * strafe) * scale, dt);
  state.me.x += x * dt;
  state.me.z += z * dt;
}

// Chân ngập dưới mặt nước (lội sông).
const isWading = () => state.me.y < waterLevel() - 0.1;

// Vào/ra khỏi nước thì có tiếng lõm bõm.
function updateWading() {
  const wading = isWading();
  if (wading === state.inWater) return;
  state.inWater = wading;
  Sfx.splash(0, 1);
}

// Đứng trên mặt đất (hoặc mặt cầu) tại chỗ đang đứng; nhảy chỉ khi đang chạm đất và không ngồi.
// `me.y` là độ cao tuyệt đối của chân. Đi lên dốc thì bị nâng theo, đi xuống dốc nhẹ thì bám đất.
function applyVertical(dt) {
  const { me } = state;
  const ground = groundAt(me.x, me.z, me.y);
  if (me.y <= ground + GROUND_STICK && state.vy <= 0) {
    me.y = ground;
    state.vy = 0;
    if (keys.has('Space') && !state.crouching && !isImmobile()) state.vy = JUMP_SPEED;
  }
  state.vy -= GRAVITY * dt;
  me.y += state.vy * dt;
  const floor = groundAt(me.x, me.z, me.y);
  if (me.y < floor) {
    me.y = floor;
    state.vy = 0;
  }
}

function updateCamera(dt) {
  const { me } = state;
  state.crouchAmount += ((state.crouching ? 1 : 0) - state.crouchAmount) * (1 - Math.exp(-14 * dt));
  state.size += (sizeOf(state.potion?.id) - state.size) * (1 - Math.exp(-POTION.sizeEase * dt)); // uống thuốc: camera lên / xuống từ từ
  state.potionFov *= Math.exp(-POTION.fx.fovEase * dt);
  const eye = eyeHeight();

  // Rung camera khi trúng đòn; giãn góc nhìn khi chạy nhanh và khi vung tay
  state.shake *= Math.exp(-14 * dt);
  state.fovKick *= Math.exp(-10 * dt);
  const sprintTarget = state.sprinting ? SPRINT_CAMERA.fovBoost : 0;
  const sprintEase = state.sprinting ? SPRINT_CAMERA.easeIn : SPRINT_CAMERA.easeOut;
  state.sprintFov += (sprintTarget - state.sprintFov) * (1 - Math.exp(-sprintEase * dt));
  camera.fov = settings.fov + state.sprintFov + state.fovKick + state.potionFov;
  const jitter = () => (Math.random() - 0.5) * 2 * state.shake;
  camera.position.set(me.x + jitter() * 0.5, me.y + eye + jitter() * 0.5, me.z + jitter() * 0.5);
  camera.rotation.set(state.pitch + jitter(), state.yaw + jitter(), jitter() * 0.5);
}

export function updateLocalPlayer(dt) {
  state.cooldown = Math.max(0, state.cooldown - dt);

  if (state.alive && state.myId !== null) {
    const { x, z } = state.me;
    if (!isImmobile()) applyMovement(dt); // đứng hình (mở đầu sự kiện): đứng yên đọc luật; võ sĩ solo ngoài hiệp cũng đứng yên
    if (isStunned()) {
      resetSlide();
      resetKnockback();
      state.vy = 0;
      updateSprint(false, dt);
    } else if (!state.tableGame) {
      applyKnockback(dt);
      applyVertical(dt);
      updateWading();
      resolveCollisions();
      settleSlide(x, z, dt);
    }
  } else if (!state.alive) {
    state.crouching = false;
    resetSlide();
    resetKnockback();
    state.stinkUntil = 0;
    updateSprint(false, dt);
  }

  updateCamera(dt);
  updateBodyView(dt);
  updateViewmodel(dt);
}
