import { createPlayerAvatar } from '../entities/avatar.js';
import { loadCharacter } from '../entities/character.js';
import { solidMaterial } from '../core/scene.js';
import { PREVIEW } from '../config.js';

const { Engine, Scene, ArcRotateCamera, HemisphericLight, DirectionalLight, Vector3, Color3, Color4, MeshBuilder } = BABYLON;

let engine = null;
let scene = null;
let avatar = null;
let currentLook = null;
let resizeObserver = null;

const resize = () => engine?.resize();

// Scene riêng cho khung xem trước trong menu, không đụng scene của ván đấu.
export function initPreview() {
  if (engine) return;
  const canvas = document.getElementById('preview');
  engine = new Engine(canvas, true, {}, true);
  scene = new Scene(engine);
  scene.clearColor = new Color4(0, 0, 0, 0); // trong suốt để thấy nền CSS của khung

  const camera = new ArcRotateCamera(
    'previewCam',
    PREVIEW.cameraAlpha,
    PREVIEW.cameraBeta,
    PREVIEW.cameraRadius,
    new Vector3(0, PREVIEW.targetY, 0),
    scene,
  );
  camera.fov = PREVIEW.fov;

  new HemisphericLight('previewSky', new Vector3(0.4, 1, 0.3), scene).intensity = 0.85;
  new DirectionalLight('previewSun', new Vector3(-0.4, -1, -0.6), scene).intensity = 0.7;

  const base = MeshBuilder.CreateCylinder('previewBase', { diameter: 2.2, height: 0.06, tessellation: 48 }, scene);
  base.position.y = -0.03;
  base.material = solidMaterial(new Color3(0.16, 0.2, 0.28), scene);

  engine.runRenderLoop(() => {
    const dt = engine.getDeltaTime() / 1000;
    if (avatar) {
      avatar.root.rotation.y += dt * PREVIEW.rotateSpeed;
      avatar.update(dt); // chạy vòng lặp idle để khung xem trước có cử động
    }
    scene.render();
  });
  addEventListener('resize', resize);
  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const previewScene = scene;
  loadCharacter(previewScene).then(() => {
    if (scene === previewScene && currentLook) setPreviewLook(currentLook);
  }); // có thể đã vào phòng trước khi model nạp xong
}

export function setPreviewLook(look) {
  currentLook = look;
  if (!scene) return;
  avatar?.root.dispose(false, true);
  avatar = createPlayerAvatar(scene, 'preview', look);
}

export function stopPreview() {
  if (!engine) return;
  removeEventListener('resize', resize);
  resizeObserver?.disconnect();
  resizeObserver = null;
  engine.stopRenderLoop();
  scene.dispose();
  engine.dispose();
  avatar = null;
  scene = null;
  engine = null;
}
