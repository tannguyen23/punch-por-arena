import { scene, solidMaterial } from '../core/scene.js';
import { state } from '../state.js';
import { Fist } from '../entities/Fist.js';
import { equipLoadout, WEAPON_MODELS } from '../entities/weapons/index.js';
import { createModelAvatar } from '../entities/character.js';
import { camera } from './camera.js';
import { showGun, updateGunView, setGunViewLook } from './gunView.js';
import { VIEWMODEL, RECOIL_RECOVER, EQUIP_RAISE_TIME } from '../config.js';

const { Vector3, Color3 } = BABYLON;

// Tay và vũ khí của mình ở góc nhìn thứ nhất. Vũ khí cận chiến cầm trên tay nhân vật model (cùng hoạt ảnh đấm với người khác);
// súng có `viewHold` thì ẩn tay model và dùng player/gunView.js.

const handMat = solidMaterial(new Color3(0.95, 0.75, 0.6));
const myFists = {
  L: new Fist(camera, new Vector3(-0.35, -0.35, 0.7), new Vector3(0.25, 0.15, 0.9), handMat, 0.22),
  R: new Fist(camera, new Vector3(0.35, -0.35, 0.7), new Vector3(-0.25, 0.15, 0.9), handMat, 0.22),
};

// Tay hiện tại: nắm đấm hình cầu lúc chưa nạp xong model, rồi chuyển sang tay của nhân vật model (xem ensureViewmodel).
let hands = myFists;
let viewmodel = null;
let viewmodelRest = null; // vị trí tay góc nhìn thứ nhất khi không nâng / hạ
let localLook = null;
let equipped = 'fist'; // vũ khí đang cầm; đổi theo state.weapon do server quyết định
let raise = 0; // 1 → 0 trong EQUIP_RAISE_TIME giây sau khi đổi vũ khí: vũ khí mới đưa từ dưới lên cho dễ để ý

const isGun = (id) => Boolean(WEAPON_MODELS[id]?.viewHold);

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
  viewmodelRest = avatar.root.position.clone();
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
  showGun(isGun(equipped) ? equipped : null);
  equipLoadout(hands, isGun(equipped) ? 'fist' : equipped, WEAPON_MODELS[equipped]?.firstPersonTilt);
  raise = 1;
}

// Ngoại hình đã chọn trong menu: tay của mình cũng mặc đúng màu (găng, da, áo).
export function setLocalLook(look) {
  localLook = look;
  handMat.diffuseColor = Color3.FromHexString(look.glove); // nắm đấm hình cầu dùng khi chưa có tay model
  setGunViewLook(look);
}

// Vung tay `hand` ('L' / 'R'); hoạt ảnh tua nhanh theo `cooldown` của vũ khí (giây). Gọi từ player/attack.js.
export function swingHand(hand, cooldown) {
  hands[hand].punch(cooldown);
}

// Gọi mỗi khung hình sau khi camera đã cập nhật.
export function updateViewmodel(dt) {
  ensureViewmodel();
  syncWeapon();
  state.recoil *= Math.exp(-RECOIL_RECOVER * dt);
  raise = Math.max(0, raise - dt / EQUIP_RAISE_TIME);
  const lift = raise * raise; // chậm dần khi gần tới chỗ
  const showHands = state.alive && !isGun(equipped);
  if (viewmodel) {
    viewmodel.root.setEnabled(showHands);
    viewmodel.root.position.copyFrom(viewmodelRest);
    viewmodel.root.position.y -= VIEWMODEL.raiseDrop * lift;
    viewmodel.update(dt);
  } else {
    for (const fist of Object.values(myFists)) {
      fist.setEnabled(showHands);
      fist.update(dt);
    }
  }
  updateGunView(state.alive, lift);
}
