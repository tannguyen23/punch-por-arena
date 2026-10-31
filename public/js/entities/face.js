import { CHARACTER, FACE_IMAGE } from '../config.js';
import { decodeFace } from './faceData.js';

const { Mesh, VertexData, VertexBuffer, StandardMaterial, DynamicTexture, Texture, Color3 } = BABYLON;

const FRONT_NORMAL_Z = 0.1; // chỉ lấy các mặt của đầu quay ra phía trước

const overlaps = (values, min, span) => Math.max(...values) >= min && Math.min(...values) <= min + span;

// Ảnh dán lên lớp phủ sao chép các mặt hướng trước của đầu (đầu hình hộp thì chỉ là một mặt phẳng; vẫn giữ cách này để đổi lại đầu cong cũng chạy), UV chiếu phẳng theo (x, y).
// Texture có viền trong suốt một texel quanh ảnh để phần UV nằm ngoài khung (bị kẹp về mép) không hiện gì.
function buildShell(head) {
  const { width, height, centerX, centerY, lift } = CHARACTER.face;
  const positions = head.getVerticesData(VertexBuffer.PositionKind);
  const normals = head.getVerticesData(VertexBuffer.NormalKind);
  const indices = head.getIndices();
  const left = centerX - width / 2 - width / FACE_IMAGE.width;
  const bottom = centerY - height / 2 - height / FACE_IMAGE.height;
  const spanU = width * (1 + 2 / FACE_IMAGE.width);
  const spanV = height * (1 + 2 / FACE_IMAGE.height);

  const shell = new VertexData();
  shell.positions = [];
  shell.normals = [];
  shell.uvs = [];
  shell.indices = [];
  for (let t = 0; t < indices.length; t += 3) {
    const corners = [indices[t], indices[t + 1], indices[t + 2]];
    if (corners.some((i) => normals[i * 3 + 2] < FRONT_NORMAL_Z)) continue;
    if (!overlaps(corners.map((i) => positions[i * 3]), left, spanU)) continue;
    if (!overlaps(corners.map((i) => positions[i * 3 + 1]), bottom, spanV)) continue;
    for (const i of corners) {
      const [x, y, z] = [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]];
      shell.indices.push(shell.positions.length / 3);
      shell.positions.push(x * lift, y * lift, z * lift);
      shell.normals.push(normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]);
      shell.uvs.push((x - left) / spanU, (y - bottom) / spanV);
    }
  }
  return shell;
}

// Mỗi người chơi có material và texture riêng nên dispose(false, true) nhân vật là an toàn.
function faceMaterial(scene, id, rgba) {
  const texture = new DynamicTexture('face' + id, { width: FACE_IMAGE.width + 2, height: FACE_IMAGE.height + 2 }, scene, true);
  texture.hasAlpha = true; // ảnh trong suốt thì lộ da của đầu ra (alpha test nên không cần sắp xếp độ sâu)
  texture.wrapU = Texture.CLAMP_ADDRESSMODE;
  texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  texture.getContext().putImageData(new ImageData(rgba, FACE_IMAGE.width, FACE_IMAGE.height), 1, 1);
  texture.update();
  const material = new StandardMaterial('face' + id, scene);
  material.diffuseTexture = texture;
  material.specularColor = Color3.Black();
  material.backFaceCulling = false;
  material.alphaCutOff = 0.9; // cao để viền ảnh (trộn với viền trong suốt màu đen) bị loại, không lộ quầng tối
  material.zOffset = -2; // vẽ đè lên da ngay bên dưới; thiếu hai dòng này thì nhìn từ xa bị nhấp nháy (z-fighting)
  material.zOffsetUnits = -2;
  return material;
}

// Dán ảnh mặt (chuỗi mã hoá của faceData.js) lên đầu của nhân vật model `body` và ẩn mắt, miệng mặc định.
export function applyFace(scene, id, body, face) {
  const rgba = decodeFace(face);
  const meshes = body.getChildMeshes(false);
  const head = meshes.find((m) => m.name === CHARACTER.face.mesh);
  if (!rgba || !head) return;
  const shell = new Mesh('face', scene);
  buildShell(head).applyToMesh(shell);
  shell.parent = head;
  shell.material = faceMaterial(scene, id, rgba);
  shell.isPickable = false;
  for (const mesh of meshes) if (CHARACTER.face.replaces.includes(mesh.name)) mesh.isVisible = false;
}
