import { scene } from '../core/scene.js';
import { state } from '../state.js';
import { equipLoadout, WEAPON_MODELS } from '../entities/weapons/index.js';
import { createModelAvatar } from '../entities/character.js';
import { camera } from './camera.js';
import { showGun, updateGunView, setGunViewLook } from './gunView.js';
import { setBodyViewLook } from './bodyView.js';
import { VIEWMODEL, RECOIL_RECOVER, EQUIP_RAISE_TIME, SKILL_THROW } from '../config.js';

const { Vector3 } = BABYLON;

// Tay và vũ khí của mình ở góc nhìn thứ nhất. Vũ khí cận chiến cầm trên tay nhân vật model (cùng hoạt ảnh đấm với người khác);
// súng có `viewHold` thì ẩn tay model và dùng player/gunView.js.

// Tay của nhân vật model; null khi model chưa nạp xong (không dùng nắm đấm hình cầu cũ nữa).
let hands = null;
let viewmodel = null;
let viewmodelRest = null; // vị trí tay góc nhìn thứ nhất khi không nâng / hạ
let localLook = null;
let equipped = 'fist'; // vũ khí đang cầm; đổi theo state.weapon do server quyết định
let raise = 0; // 1 → 0 trong EQUIP_RAISE_TIME giây sau khi đổi vũ khí: vũ khí mới đưa từ dưới lên cho dễ để ý
let aimPose = 0; // 0 → 1 khi giữ phím ngắm skill ném / lựu đạn (state.skillAim, state.grenadeAim): tay giơ lên và thu lại, xem SKILL_THROW.pose
let wasAlive = true; // dọn hoạt ảnh đang dở khi bị hạ (viewmodel bị ẩn lúc chết)

const isGun = (id) => Boolean(WEAPON_MODELS[id]?.viewHold);

// Co tay về `scale` và đặt sao cho mắt của model nằm đúng VIEWMODEL.offset trong hệ camera (ghi vào viewmodelRest).
function placeViewmodel(avatar, scale) {
  const { offset } = VIEWMODEL;
  const { eyePoint } = avatar;
  avatar.root.scaling.setAll(scale);
  viewmodelRest.set(offset.x - eyePoint.x * scale, offset.y - eyePoint.y * scale, offset.z - eyePoint.z * scale);
}

// Dựng tay từ nhân vật model khi đã nạp xong: gắn vào camera, co nhỏ và đẩy ra trước để thấy ở hai góc dưới màn hình,
// vẽ đè lên mọi thứ. Vũ khí đang cầm được chuyển sang tay mới.
function ensureViewmodel() {
  if (viewmodel || !VIEWMODEL.enabled || !localLook) return;
  const avatar = createModelAvatar(scene, 'me', localLook, { viewmodel: true });
  if (!avatar) return; // model chưa nạp xong, thử lại khung sau
  avatar.root.parent = camera;
  viewmodelRest = new Vector3();
  placeViewmodel(avatar, VIEWMODEL.scale);
  scene.setRenderingAutoClearDepthStencil(VIEWMODEL.renderingGroup, true, true, true);
  viewmodel = avatar;
  hands = avatar.fists;
  equipped = null; // buộc cầm lại vũ khí đang có lên tay mới
}

function syncWeapon() {
  const visual = state.event?.kind === 'tnt' && state.event.targetId === state.myId ? 'tnt' : state.weapon;
  if (visual === equipped) return;
  equipped = visual;
  showGun(isGun(equipped) ? equipped : null);
  if (hands) equipLoadout(hands, isGun(equipped) ? 'fist' : equipped, WEAPON_MODELS[equipped]?.firstPersonTilt);
  raise = 1;
}

// Ngoại hình đã chọn trong menu: tay của mình cũng mặc đúng màu (găng, da, áo).
export function setLocalLook(look) {
  localLook = look;
  setGunViewLook(look);
  setBodyViewLook(look);
}

// Vung tay `hand` ('L' / 'R'); hoạt ảnh tua nhanh theo `cooldown` của vũ khí (giây). Gọi từ player/attack.js.
export function swingHand(hand, cooldown) {
  if (hands) hands[hand].punch(cooldown);
}

// Đấm lớn của tay phải: 'charge' (tích lực) | 'release' (thả, đấm nốt) | 'cancel' (huỷ). Xem player/bigPunch.js.
// Model chưa nạp xong (chưa có tay) thì bỏ qua.
export function bigPunchHand(action) {
  hands?.R[`${action}Big`]?.();
}

// Gọi mỗi khung hình sau khi camera đã cập nhật.
export function updateViewmodel(dt) {
  ensureViewmodel();
  syncWeapon();
  if (wasAlive && !state.alive) viewmodel?.resetAnimation();
  wasAlive = state.alive;
  state.recoil *= Math.exp(-RECOIL_RECOVER * dt);
  raise = Math.max(0, raise - dt / EQUIP_RAISE_TIME);
  const lift = raise * raise; // chậm dần khi gần tới chỗ
  // Đang gồng / bay đấm trời giáng: cầm súng cũng tạm đổi sang nắm đấm để chạy hoạt ảnh (player/bigPunch.js), súng hiện lại sau khi xong.
  const canShow = state.joined && state.alive && !state.dog && !state.spectator; // chưa vào phòng thì không hiện tay sau menu
  const bigPunching = state.bigPunch.charging || state.leap !== null;
  const showHands = canShow && (!isGun(equipped) || bigPunching); // chó không có tay; camera khán giả bay tự do
  if (viewmodel) {
    viewmodel.root.setEnabled(showHands);
    placeViewmodel(viewmodel, VIEWMODEL.scale * state.size ** VIEWMODEL.sizeExponent); // to hơn / nhỏ hơn một phần theo thuốc
    viewmodel.setRunning(state.alive && state.sprinting);
    viewmodel.root.position.copyFrom(viewmodelRest);
    viewmodel.root.position.y -= VIEWMODEL.raiseDrop * lift;
    const { pose } = SKILL_THROW;
    aimPose += ((state.skillAim || state.grenadeAim ? 1 : 0) - aimPose) * Math.min(1, pose.ease * dt);
    viewmodel.root.position.x += pose.side * aimPose;
    viewmodel.root.position.y += pose.up * aimPose;
    viewmodel.root.position.z -= pose.back * aimPose;
    viewmodel.update(performance.now() < state.handStopUntil ? 0 : dt); // hit stop: tay đứng hình một nhịp lúc đấm trúng
  }
  updateGunView(canShow && !bigPunching, lift);
}
