import { solidMaterial } from '../core/scene.js';
import { part, box, ball } from '../core/meshes.js';
import { shirtMaterial } from './shirtPattern.js';
import { Arm } from './Arm.js';
import { createModelAvatar } from './character.js';

const { Color3, TransformNode } = BABYLON;

function createLegs(scene, root, pantsMat, shoeMat) {
  return [-1, 1].map((side) => {
    const hip = new TransformNode('hip', scene);
    hip.parent = root;
    hip.position.set(side * 0.17, 0.72, 0);
    part(box(0.28, 0.66, 0.3, scene), hip, 0, -0.33, 0, pantsMat);
    part(box(0.3, 0.12, 0.4, scene), hip, 0, -0.66, 0.05, shoeMat);
    return hip;
  });
}

function createHead(scene, upper, { skinMat, hairColor, darkMat }) {
  const whiteMat = solidMaterial(Color3.White(), scene);
  const head = new TransformNode('head', scene);
  head.parent = upper;
  head.position.y = 1.62;
  part(ball(0.52, scene), head, 0, 0, 0, skinMat);
  part(ball(0.56, scene), head, 0, 0.16, -0.06, solidMaterial(hairColor, scene)).scaling.y = 0.5;
  for (const side of [-1, 1]) {
    part(ball(0.1, scene), head, side * 0.09, 0.04, 0.235, whiteMat);
    part(ball(0.05, scene), head, side * 0.09, 0.04, 0.27, darkMat);
    // lông mày chếch xuống phía mũi cho có vẻ hung dữ
    part(box(0.1, 0.025, 0.02, scene), head, side * 0.09, 0.11, 0.225, darkMat).rotation.z = -side * 0.3;
  }
  part(ball(0.07, scene), head, 0, -0.02, 0.27, skinMat);
  part(box(0.12, 0.02, 0.02, scene), head, 0, -0.11, 0.235, solidMaterial(new Color3(0.55, 0.15, 0.15), scene));
}

// Thân, đầu, tay, chân của một nhân vật. Tách khỏi thanh máu/tên để menu dựng preview bằng cùng hình mẫu.
export function createAvatar(scene, id, look) {
  const root = new TransformNode('avatar' + id, scene);
  const shirtColor = Color3.FromHexString(look.shirt);
  const accentMat = solidMaterial(Color3.FromHexString(look.glove), scene); // găng tay, thắt lưng
  const skinMat = solidMaterial(Color3.FromHexString(look.skin), scene);
  const sleeveMat = solidMaterial(shirtColor, scene);
  const pantsMat = solidMaterial(Color3.FromHexString(look.pants), scene);
  const darkMat = solidMaterial(new Color3(0.08, 0.08, 0.1), scene);

  const legs = createLegs(scene, root, pantsMat, darkMat);

  // Phần thân trên nằm trong `upper` để hạ thấp xuống khi người chơi ngồi
  const upper = new TransformNode('upper', scene);
  upper.parent = root;

  part(box(0.7, 0.68, 0.38, scene), upper, 0, 1.04, 0, shirtMaterial(scene, id, look));
  part(box(0.72, 0.08, 0.4, scene), upper, 0, 0.74, 0, accentMat);
  createHead(scene, upper, { skinMat, hairColor: Color3.FromHexString(look.hair), darkMat });

  const fists = {
    L: new Arm(scene, upper, -1, sleeveMat, skinMat, accentMat),
    R: new Arm(scene, upper, 1, sleeveMat, skinMat, accentMat),
  };

  // Ngồi: co ngắn chân lại cho vừa thân đã hạ xuống; `swing` là góc đưa chân qua lại khi đi.
  const pose = (crouch, swing) => {
    const legScale = (0.72 - 0.35 * crouch) / 0.72;
    legs[0].rotation.x = swing;
    legs[1].rotation.x = -swing;
    for (const leg of legs) {
      leg.position.y = 0.72 * legScale;
      leg.scaling.y = legScale;
    }
  };

  // Nhân vật dựng bằng code (khi model chưa nạp xong) không có hoạt ảnh ngã / hồi sinh: giữ nguyên giao diện với bản model.
  return { root, upper, legs, fists, pose, update: (dt) => (fists.L.update(dt), fists.R.update(dt)), setAirborne() {}, setRunning() {}, knockOut() {}, resetAnimation() {} };
}

// Nhân vật từ model .glb nếu đã nạp xong, chưa thì dùng nhân vật dựng bằng code.
export function createPlayerAvatar(scene, id, look) {
  return createModelAvatar(scene, id, look) ?? createAvatar(scene, id, look);
}
