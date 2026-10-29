import { scene, solidMaterial } from '../core/scene.js';
import { state } from '../state.js';
import { part, ball, cylinder } from '../core/meshes.js';
import { createWeaponModel, WEAPON_MODELS } from '../entities/weapons/index.js';
import { VIEWMODEL, GUN_VIEW } from '../config.js';
import { camera } from './camera.js';

const { TransformNode, Vector3, Quaternion, Color3 } = BABYLON;

// Súng ở góc nhìn thứ nhất: không gắn vào bàn tay của nhân vật model (ở thế thủ cẳng tay che mất súng) mà đặt cố định trong hệ camera
// theo `viewHold` của từng súng, nòng chĩa vào tâm ngắm; hai bàn tay dựng riêng ôm lấy báng và ốp tay. Vẽ đè như tay (không xuyên tường).

const gloveMat = solidMaterial(new Color3(0.12, 0.53, 0.9));
const skinMat = solidMaterial(new Color3(0.96, 0.78, 0.64));
const sleeveMat = solidMaterial(new Color3(0.9, 0.22, 0.21));

const root = new TransformNode('gunView', scene); // chỗ đặt giật / nâng súng lên khi vừa đổi
root.parent = camera;

let current = null; // { id, holder, muzzle } của súng đang hiện
let wanted = null;

// Màu găng, da, áo của mình (chọn ở menu).
export function setGunViewLook(look) {
  gloveMat.diffuseColor = Color3.FromHexString(look.glove);
  skinMat.diffuseColor = Color3.FromHexString(look.skin);
  sleeveMat.diffuseColor = Color3.FromHexString(look.shirt);
}

// Thanh hình trụ từ `from` theo hướng `dir` (đơn vị) dài `length`.
function limb(parent, from, dir, length, diameter, material) {
  const mesh = part(cylinder(diameter, diameter * 1.1, length), parent, 0, 0, 0, material);
  mesh.position = from.add(dir.scale(length / 2));
  mesh.rotationQuaternion = Quaternion.FromUnitVectorsToRef(Vector3.Up(), dir, new Quaternion());
}

// Một bàn tay: găng ở `at` (hệ của súng sau khi xoay, +Y là hướng nòng, +Z là phía dưới màn hình), cẳng tay và tay áo
// kéo về phía người chơi theo hướng `arm` cho tới ngoài mép màn hình.
function addHand(parent, at, arm) {
  const glove = part(ball(1), parent, at.x, at.y, at.z, gloveMat);
  glove.scaling.set(...GUN_VIEW.glove);
  const dir = arm.normalize();
  const wrist = at.add(dir.scale(GUN_VIEW.glove[1] * 0.35));
  limb(parent, wrist, dir, GUN_VIEW.forearmLength, GUN_VIEW.forearm, skinMat);
  limb(parent, wrist.add(dir.scale(GUN_VIEW.forearmLength)), dir, GUN_VIEW.sleeveLength, GUN_VIEW.sleeve, sleeveMat);
}

const drawOnTop = (node) => node.getChildMeshes().forEach((mesh) => (mesh.renderingGroupId = VIEWMODEL.renderingGroup));

function clear() {
  current?.holder.dispose();
  current = null;
}

// Hiện súng `id` (null = không cầm súng). Chỉ súng có `viewHold` mới dùng cách cầm này.
export function showGun(id) {
  wanted = id;
  clear();
  const hold = WEAPON_MODELS[id]?.viewHold;
  if (!hold) return;
  const scale = hold.scale ?? 1;
  const holder = new TransformNode('gunHolder', scene);
  holder.parent = root;
  holder.position.set(...hold.position);
  holder.rotation.set(...hold.rotation);
  hold.hands.forEach(([x, y, z], i) => addHand(holder, new Vector3(x, y, z).scale(scale), Vector3.FromArray(GUN_VIEW.arms[i])));
  current = { id, holder, muzzle: Vector3.FromArray(hold.muzzle).scale(scale) };
  drawOnTop(holder);
  createWeaponModel(id).then((model) => {
    if (!model) return;
    if (wanted !== id || current?.holder !== holder) {
      model.dispose(); // trong lúc nạp đã đổi sang vũ khí khác
      return;
    }
    model.parent = holder;
    model.scaling.scaleInPlace(scale);
    drawOnTop(holder);
  });
}

// `lift`: 1 = vừa đổi súng (hạ xuống dưới màn hình) → 0 = đã nâng lên. Ghi chỗ đầu nòng vào state.muzzle cho lửa đầu nòng và vệt đạn.
export function updateGunView(visible, lift) {
  root.setEnabled(visible && current !== null);
  root.position.set(0, -GUN_VIEW.raiseDrop * lift, -GUN_VIEW.recoilBack * state.recoil);
  root.rotation.x = -GUN_VIEW.recoilLift * state.recoil - GUN_VIEW.raiseTilt * lift; // hếch nòng lên khi giật
  if (!visible || !current) {
    state.muzzle = null;
    return;
  }
  current.holder.computeWorldMatrix(true);
  const tip = Vector3.TransformCoordinates(current.muzzle, current.holder.getWorldMatrix());
  state.muzzle = { x: tip.x, y: tip.y, z: tip.z };
}
