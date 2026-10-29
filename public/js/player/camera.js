import { scene } from '../core/scene.js';
import { settings } from '../settings.js';
import { EYE_HEIGHT } from '../config.js';

// Camera góc nhìn thứ nhất. Tay, vũ khí góc nhìn thứ nhất gắn vào đây; vị trí/hướng do player/localPlayer.js cập nhật mỗi khung hình.
export const camera = new BABYLON.UniversalCamera('cam', new BABYLON.Vector3(0, EYE_HEIGHT, 0), scene);
camera.inputs.clear();
camera.minZ = 0.05;
camera.fov = settings.fov;
