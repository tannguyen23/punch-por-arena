import { scene, solidMaterial } from '../core/scene.js';
import { keys } from '../core/keys.js';
import { state } from '../state.js';
import { settings } from '../settings.js';
import { Fist } from '../entities/Fist.js';
import { equipLoadout, WEAPON_MODELS } from '../entities/weapons/index.js';
import { createModelAvatar } from '../entities/character.js';
import { send } from '../net/socket.js';
import { resolveCollisions } from './collision.js';
import { groundAt, waterLevel } from '../core/terrain.js';
import * as Sfx from '../audio/sfx.js';
import {
  PUNCH_COOLDOWN, MOVE_SPEED, EYE_HEIGHT, CROUCH_EYE_HEIGHT, SPRINT_MULT, CROUCH_MULT,
  JUMP_SPEED, GRAVITY, WATER_SPEED_MULT, GROUND_STICK, VIEWMODEL,
} from '../config.js';

const { Vector3, Color3 } = BABYLON;

const camera = new BABYLON.UniversalCamera('cam', new Vector3(0, EYE_HEIGHT, 0), scene);
camera.inputs.clear();
camera.minZ = 0.05;
camera.fov = settings.fov;

const handMat = solidMaterial(new Color3(0.95, 0.75, 0.6));
const myFists = {
  L: new Fist(camera, new Vector3(-0.35, -0.35, 0.7), new Vector3(0.25, 0.15, 0.9), handMat, 0.22),
  R: new Fist(camera, new Vector3(0.35, -0.35, 0.7), new Vector3(-0.25, 0.15, 0.9), handMat, 0.22),
};

// Tay hiện tại: nắm đấm hình cầu lúc chưa nạp xong model, rồi chuyển sang tay của nhân vật model (xem ensureViewmodel).
let hands = myFists;
let viewmodel = null;
let localLook = null;
let wasAlive = true; // để dọn hoạt ảnh đang dở khi bị hạ (viewmodel bị ẩn lúc chết)
let equipped = 'fist'; // vũ khí đang cầm trên tay phải; đổi theo state.weapon do server quyết định

// Dựng tay từ nhân vật model khi đã nạp xong: gắn vào camera, co nhỏ và đẩy ra trước để thấy ở hai góc dưới màn hình,
// vẽ đè lên mọi thứ. Vũ khí đang cầm được chuyển sang tay mới.
function ensureViewmodel() {
  if (viewmodel || !VIEWMODEL.enabled || !localLook) return;
  const avatar = createModelAvatar(scene, 'me', localLook, { viewmodel: true });
  if (!avatar) return; // model chưa nạp xong, thử lại khung sau
  const { scale, offset } = VIEWMODEL;
  avatar.root.parent = camera;
  avatar.root.scaling.setAll(scale);
  avatar.root.position.set(offset.x - avatar.eyePoint.x * scale, offset.y - avatar.eyePoint.y * scale, offset.z - avatar.eyePoint.z * scale);
  scene.setRenderingAutoClearDepthStencil(VIEWMODEL.renderingGroup, true, true, true);
  for (const fist of Object.values(myFists)) {
    fist.drop();
    fist.setEnabled(false);
  }
  viewmodel = avatar;
  hands = avatar.fists;
  equipped = null; // buộc cầm lại vũ khí đang có lên tay mới
}

function syncWeapon() {
  if (state.weapon === equipped) return;
  equipped = state.weapon;
  equipLoadout(hands, equipped, WEAPON_MODELS[equipped]?.firstPersonTilt);
}

// Ngoại hình đã chọn trong menu: tay của mình cũng mặc đúng màu (găng, da, áo).
export function setLocalLook(look) {
  localLook = look;
  handMat.diffuseColor = Color3.FromHexString(look.glove); // nắm đấm hình cầu dùng khi chưa có tay model
}

export function look(movementX, movementY, sensitivity) {
  state.yaw += movementX * sensitivity;
  state.pitch = Math.max(-1.4, Math.min(1.4, state.pitch + movementY * sensitivity));
}

// button: 0 = chuột trái (tay trái), 2 = chuột phải (tay phải).
// Tay sẽ đấm tiếp theo khi giữ chuột với vũ khí tự đánh (luân phiên trái/phải).
let autoButton = 0;

// button: 0 = chuột trái (tay trái), 2 = chuột phải (tay phải). Trả về true nếu đã đấm.
export function tryPunch(button) {
  if (!state.alive || state.cooldown > 0 || state.match.phase !== 'playing') return false;
  if (button !== 0 && button !== 2) return false;
  const hand = button === 0 ? 'L' : 'R';
  const cooldown = (state.weaponTypes[state.weapon]?.cooldown ?? PUNCH_COOLDOWN * 1000) / 1000;
  state.cooldown = cooldown;
  state.fovKick = 0.07 * Math.min(1, cooldown / PUNCH_COOLDOWN); // đấm càng nhanh càng giật nhẹ
  hands[hand].punch(cooldown);
  Sfx.at(WEAPON_MODELS[state.weapon]?.swingSound ?? 'whoosh', 0, 0, 0, 0, 0);
  send({ t: 'punch', hand });
  autoButton = button === 0 ? 2 : 0;
  return true;
}

// Giữ chuột với vũ khí tự đánh (găng sấm sét): đấm liên tục, luân phiên hai tay.
function autoAttack() {
  if (state.attacking && WEAPON_MODELS[state.weapon]?.autoFire) tryPunch(autoButton);
}

function applyMovement(dt) {
  const fwd = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
  const strafe = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
  const len = Math.hypot(fwd, strafe) || 1;
  const moving = fwd !== 0 || strafe !== 0;
  const sin = Math.sin(state.yaw);
  const cos = Math.cos(state.yaw);

  state.crouching = keys.has('KeyC');
  state.sprinting = moving && !state.crouching && (keys.has('ShiftLeft') || keys.has('ShiftRight'));
  const speed = MOVE_SPEED * (state.sprinting ? SPRINT_MULT : state.crouching ? CROUCH_MULT : 1) * (isWading() ? WATER_SPEED_MULT : 1);
  state.me.x += ((sin * fwd + cos * strafe) / len) * speed * dt * (moving ? 1 : 0);
  state.me.z += ((cos * fwd - sin * strafe) / len) * speed * dt * (moving ? 1 : 0);
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
    if (keys.has('Space') && !state.crouching) state.vy = JUMP_SPEED;
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
  const eye = EYE_HEIGHT + (CROUCH_EYE_HEIGHT - EYE_HEIGHT) * state.crouchAmount;

  // Rung camera khi trúng đòn; giãn góc nhìn khi chạy nhanh và khi vung tay
  state.shake *= Math.exp(-14 * dt);
  state.fovKick *= Math.exp(-10 * dt);
  state.sprintFov += ((state.sprinting ? 0.12 : 0) - state.sprintFov) * (1 - Math.exp(-8 * dt));
  camera.fov = settings.fov + state.sprintFov + state.fovKick;
  const jitter = () => (Math.random() - 0.5) * 2 * state.shake;
  camera.position.set(me.x + jitter() * 0.5, me.y + eye + jitter() * 0.5, me.z + jitter() * 0.5);
  camera.rotation.set(state.pitch + jitter(), state.yaw + jitter(), jitter() * 0.5);
}

export function updateLocalPlayer(dt) {
  ensureViewmodel();
  syncWeapon();
  if (wasAlive && !state.alive) viewmodel?.resetAnimation();
  wasAlive = state.alive;
  state.cooldown = Math.max(0, state.cooldown - dt);
  autoAttack();

  if (state.alive && state.myId !== null) {
    applyMovement(dt);
    applyVertical(dt);
    updateWading();
    resolveCollisions();
  } else if (!state.alive) {
    state.crouching = false;
    state.sprinting = false;
  }

  updateCamera(dt);
  if (viewmodel) {
    viewmodel.root.setEnabled(state.alive);
    viewmodel.update(dt);
  } else {
    for (const fist of Object.values(myFists)) {
      fist.setEnabled(state.alive);
      fist.update(dt);
    }
  }
}
