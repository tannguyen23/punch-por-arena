import { solidMaterial } from '../core/scene.js';
import { CHARACTER, VIEWMODEL } from '../config.js';
import { shirtMaterial } from './shirtPattern.js';
import { createCharacterAnimator } from './characterAnimator.js';
import { applyFace } from './face.js';
import { attachJetpack } from './jetpack.js';
import { createHitFlash } from './hitFlash.js';

const { TransformNode, Color3, Vector3, Quaternion, Matrix } = BABYLON;

// Mỗi scene (game, menu preview) nạp model riêng một lần.
const loading = new WeakMap(); // scene → Promise<template | null>
const templates = new WeakMap(); // scene → template, có khi nạp xong

const TINT_PREFIX = /^(shirt|pants|glove|skin|hair)_/;
// Bộ phận của một khối: theo tiền tố tên, rồi theo tên khối, rồi theo tên nhóm cha (vd: mọi khối trong nhóm `hair` là tóc).
const kindOf = (mesh) =>
  TINT_PREFIX.exec(mesh.name)?.[1] ?? CHARACTER.kinds[mesh.name] ?? CHARACTER.groupKinds[mesh.parent?.name] ?? null;

// UV trong file chỉ chiếm một góc nhỏ của ảnh nên không dán hoạ tiết được. Tính lại UV theo hình hộp:
// mỗi mặt phủ trọn ảnh một lần (cùng cách nhân vật dựng bằng code). Chạy một lần vì các bản sao dùng chung hình học.
function boxProjectUVs(mesh) {
  const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
  const normals = mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind);
  const uvs = new Float32Array((positions.length / 3) * 2);
  const bounds = mesh.getBoundingInfo().boundingBox;
  const min = [bounds.minimum.x, bounds.minimum.y, bounds.minimum.z];
  const size = [bounds.extendSize.x * 2 || 1, bounds.extendSize.y * 2 || 1, bounds.extendSize.z * 2 || 1];
  for (let i = 0; i < positions.length / 3; i++) {
    const n = [Math.abs(normals[i * 3]), Math.abs(normals[i * 3 + 1]), Math.abs(normals[i * 3 + 2])];
    const axis = n.indexOf(Math.max(...n)); // trục pháp tuyến của mặt này
    const [a, b] = axis === 0 ? [2, 1] : axis === 1 ? [0, 2] : [0, 1]; // hai trục còn lại tạo thành u, v
    uvs[i * 2] = (positions[i * 3 + a] - min[a]) / size[a];
    uvs[i * 2 + 1] = (positions[i * 3 + b] - min[b]) / size[b];
  }
  mesh.setVerticesData(BABYLON.VertexBuffer.UVKind, uvs);
}

// Nạp model và đo chiều cao thật để dựng nhân vật nào cũng cùng kích thước.
async function load(scene) {
  const container = await BABYLON.SceneLoader.LoadAssetContainerAsync('', CHARACTER.url, scene, null, '.glb');
  let minY = Infinity;
  let maxY = -Infinity;
  for (const mesh of container.meshes) {
    if (!mesh.getTotalVertices()) continue;
    mesh.computeWorldMatrix(true);
    const box = mesh.getBoundingInfo().boundingBox;
    minY = Math.min(minY, box.minimumWorld.y);
    maxY = Math.max(maxY, box.maximumWorld.y);
    if (CHARACTER.patternMeshes.includes(mesh.name)) boxProjectUVs(mesh);
  }
  return { container, minY, scale: CHARACTER.height / (maxY - minY) };
}

// Bắt đầu nạp (nếu chưa) và trả về promise; null nếu lỗi.
export function loadCharacter(scene) {
  if (!loading.has(scene)) {
    loading.set(
      scene,
      load(scene)
        .then((template) => {
          templates.set(scene, template);
          return template;
        })
        .catch((err) => {
          console.error('Không nạp được nhân vật:', err);
          return null;
        }),
    );
  }
  return loading.get(scene);
}

// Màu của một bộ phận theo ngoại hình `look`: màu người chơi chọn, màu cố định, hoặc màu của bộ phận khác sẫm đi (CHARACTER.shadedColors). Null nếu không có.
export function kindColor(kind, look) {
  const hex = look[kind] ?? CHARACTER.fixedColors[kind];
  if (hex) return Color3.FromHexString(hex);
  const shaded = CHARACTER.shadedColors[kind];
  const base = shaded && kindColor(shaded.of, look);
  return base ? base.scale(shaded.mult) : null;
}

// Mỗi người chơi có material riêng nên dispose(false, true) nhân vật là an toàn.
function tint(scene, id, body, look) {
  const materials = new Map();
  const shirt = shirtMaterial(scene, id, look);
  shirt.backFaceCulling = false;
  const materialFor = (kind) => {
    const color = kindColor(kind, look);
    if (!color) return null;
    if (!materials.has(kind)) {
      const mat = solidMaterial(color, scene);
      mat.backFaceCulling = false;
      const offset = CHARACTER.featureZOffset[kind];
      if (offset) {
        mat.zOffset = offset; // mắt / mũi / miệng / con ngươi gần trùng mặt phẳng với khối nằm dưới, thiếu hai dòng này thì nhấp nháy
        mat.zOffsetUnits = offset;
      }
      materials.set(kind, mat);
    }
    return materials.get(kind);
  };
  for (const mesh of body.getChildMeshes(false)) {
    const kind = kindOf(mesh);
    if (CHARACTER.patternMeshes.includes(mesh.name)) mesh.material = shirt;
    else if (kind) mesh.material = materialFor(kind) ?? mesh.material;
  }
  return [shirt, ...materials.values()]; // material riêng của người này (chớp sáng khi trúng đòn, entities/hitFlash.js)
}

// Neo cầm vũ khí gắn thẳng vào khối bàn tay nên vũ khí đi theo tay khi vung. Ở tư thế đứng yên, vũ khí nằm giữa bàn tay,
// kéo dài theo cẳng tay (đầu vũ khí hướng +Y trùng hướng -Y cục bộ của bàn tay), đúng cỡ và không bị lật gương
// (cây cầm trên tay mang theo phép lật z của model nên phải bù bằng đúng ma trận nghịch đảo).
function createHandAnchor(scene, handMesh) {
  const anchor = new TransformNode('handAnchor', scene);
  if (!handMesh) return anchor;
  handMesh.computeWorldMatrix(true);
  const world = handMesh.getWorldMatrix().clone();
  const along = Vector3.TransformNormal(Vector3.Down(), world).normalize();
  const rotation = Quaternion.FromUnitVectorsToRef(Vector3.Up(), along, new Quaternion());
  const wanted = Matrix.Compose(Vector3.One(), rotation, handMesh.getBoundingInfo().boundingBox.centerWorld);
  const local = wanted.multiply(Matrix.Invert(world));
  anchor.parent = handMesh;
  anchor.rotationQuaternion = new Quaternion();
  local.decompose(anchor.scaling, anchor.rotationQuaternion, anchor.position);
  return anchor;
}

// Xoay `item` (đầu vũ khí hướng +Y trong hệ neo) sao cho nó chĩa theo hướng (0, cos tilt, sin tilt) của camera: chếch lên và ra trước.
// Neo gắn vào bàn tay nên vũ khí vẫn đi theo tay khi vung; chỉ hướng lúc đứng yên được chọn theo `tilt` của từng vũ khí.
function aimAtCameraTilt(item, anchor, root, tilt) {
  anchor.computeWorldMatrix(true);
  root.computeWorldMatrix(true);
  const anchorToRoot = anchor.getWorldMatrix().multiply(Matrix.Invert(root.getWorldMatrix()));
  const wanted = new Vector3(0, Math.cos(tilt), Math.sin(tilt));
  const local = Vector3.TransformNormal(wanted, Matrix.Invert(anchorToRoot)).normalize();
  item.rotationQuaternion = Quaternion.FromUnitVectorsToRef(Vector3.Up(), local, new Quaternion());
}

// Một tay của nhân vật model: cầm vũ khí ở neo và chạy hoạt ảnh đấm / chém khi bị gọi punch().
// `view` (chỉ có ở tay góc nhìn thứ nhất): { root, group } — vũ khí được vẽ đè (nhóm vẽ `group`).
// Có `tilt` thì vũ khí chĩa theo (0, cos tilt, sin tilt) của camera (góc nhìn thứ nhất) hoặc của thân nhân vật `root` (người khác cầm súng).
function createHand(anchor, animator, side, root, view = null) {
  const slide = side === 'L' ? 'SL' : 'S'; // tay trái dùng bản soi gương của Right Slide
  return {
    attack: null, // kiểu đánh của vũ khí đang cầm ('slide' = chém), equipWeapon gán
    punch(cooldown) {
      animator?.play(this.attack === 'slide' && animator?.sets[slide] ? slide : side, cooldown);
    },
    // Đấm lớn (người hoá to): tích lực giữ ở tư thế lấy đà, thả thì đấm nốt, huỷ thì về tư thế đứng yên (xem characterAnimator.js).
    chargeBig: () => animator?.chargeBig(),
    releaseBig: () => animator?.releaseBig(),
    cancelBig: () => animator?.cancelBig(),
    update() {},
    hold(item, tilt) {
      this.drop();
      this.held = item;
      item.parent = anchor;
      item.position.set(0, 0, 0);
      item.rotation.set(0, 0, 0);
      if (view) for (const mesh of item.getChildMeshes()) mesh.renderingGroupId = view.group;
      if (tilt !== undefined) aimAtCameraTilt(item, anchor, view?.root ?? root, tilt);
    },
    drop() {
      this.held?.dispose();
      this.held = null;
    },
  };
}

// Cùng giao diện với createAvatar (root, upper, legs, fists, pose). Null nếu model chưa nạp xong.
// options.viewmodel: dựng làm tay góc nhìn thứ nhất (chỉ giữ lại các khối trong VIEWMODEL.meshes, vẽ ở nhóm VIEWMODEL.renderingGroup).
export function createModelAvatar(scene, id, look, options = {}) {
  const template = templates.get(scene);
  if (!template) return null;

  const root = new TransformNode('avatar' + id, scene);
  const holder = new TransformNode('model', scene);
  holder.parent = root;
  holder.scaling.setAll(template.scale);
  const body = new TransformNode('modelBody', scene);
  body.parent = holder;
  body.position.y = -template.minY; // chân chạm đất
  body.rotation.y = CHARACTER.facing;
  const { rootNodes, animationGroups } = template.container.instantiateModelsToScene((name) => name, false);
  rootNodes.forEach((node) => (node.parent = body));
  const ownMaterials = tint(scene, id, body, look);
  if (look.face && !options.viewmodel) applyFace(scene, id, body, look.face); // tay góc nhìn thứ nhất không có đầu
  const legs = ['left_L', 'right_L'].map((name) => body.getChildTransformNodes(false, (n) => n.name === name)[0]);
  // Tư thế đứng yên lấy từ khung đầu của idle (model cũ không có idle thì dùng thế thủ của cú đấm).
  // Phần xoay của chân do pose() ghi (đung đưa khi đi + bước chân của animation).
  const animator = createCharacterAnimator(body, animationGroups, { driven: legs.filter(Boolean), idleSpeed: CHARACTER.idleSpeed, bigWindup: CHARACTER.bigWindup });
  const handMesh = (name) => body.getChildMeshes(false).find((m) => m.name === name);

  // Điểm giữa hai mắt (khi chưa dời nhân vật đi đâu): chỗ đặt camera cho tay góc nhìn thứ nhất.
  const eyes = CHARACTER.eyeMeshes.map(handMesh).filter(Boolean);
  const eyePoint = eyes.reduce((sum, m) => {
    m.computeWorldMatrix(true);
    return sum.add(m.getBoundingInfo().boundingBox.centerWorld);
  }, Vector3.Zero()).scale(1 / Math.max(1, eyes.length));

  // Động cơ phản lực sau lưng: tay góc nhìn thứ nhất và chân của mình (bodyView) không có, các khối của chúng bị ẩn riêng.
  const jet = options.viewmodel || options.jetpack === false ? null : attachJetpack(scene, body);

  const view = options.viewmodel ? { root, group: VIEWMODEL.renderingGroup } : null;
  if (view) {
    for (const mesh of body.getChildMeshes(false)) {
      if (VIEWMODEL.meshes.includes(mesh.name)) mesh.renderingGroupId = view.group;
      else mesh.isVisible = false; // ẩn khỏi khung hình nhưng KHÔNG tắt hẳn: tắt một khối sẽ tắt luôn mọi khối con (vd: __root__ là mesh rỗng chứa cả nhân vật)
    }
  }

  const upper = new TransformNode('upper', scene); // chỗ treo thanh máu và tên
  upper.parent = root;

  const swing = new Quaternion();
  return {
    root,
    upper,
    legs,
    eyePoint,
    fists: {
      L: createHand(createHandAnchor(scene, handMesh(CHARACTER.offHandMesh)), animator, 'L', root, view),
      R: createHand(createHandAnchor(scene, handMesh(CHARACTER.handMesh)), animator, 'R', root, view),
    },
    jet,
    hitFlash: options.viewmodel ? null : createHitFlash(ownMaterials), // tay góc nhìn thứ nhất không bị chớp
    update: (dt) => (animator?.update(dt), jet?.update(dt)),
    hit: (power) => animator?.hit(power), // giật mình khi bị đánh (hoạt ảnh "beaten" chồng lên hoạt ảnh đang chạy)
    // Rời đất / chạm đất: chạy hoạt ảnh nhảy. `airTime` là thời gian bay dự kiến (giây).
    setAirborne: (airborne, airTime) => animator?.setAirborne(airborne, airTime),
    setRunning: (running) => animator?.setRunning(running),
    // Bị hạ: ngã và nằm dưới đất. Hồi sinh: đứng dậy về tư thế đứng yên.
    knockOut: () => animator?.knockOut(),
    resetAnimation: () => animator?.reset(),
    // Chân đung đưa khi đi (chưa có animation đi bộ), cộng thêm bước chân của hoạt ảnh đấm / chân của hoạt ảnh nhảy nếu đang có. Ngồi chưa có hiệu ứng.
    pose(crouch, angle) {
      const walking = animator?.airborne || (animator?.running && animator.sets.Run) || animator?.stage === 'ko' ? 0 : angle;
      legs.forEach((leg, i) => {
        if (!leg) return;
        Quaternion.RotationAxisToRef(Vector3.Right(), i === 0 ? walking : -walking, swing);
        const stepping = animator?.rotationOf(leg);
        if (!leg.rotationQuaternion) leg.rotationQuaternion = new Quaternion();
        if (stepping) stepping.multiplyToRef(swing, leg.rotationQuaternion);
        else leg.rotationQuaternion.copyFrom(swing);
      });
    },
  };
}
