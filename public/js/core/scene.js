const { Vector3, Color3, Color4, StandardMaterial } = BABYLON;

export const canvas = document.getElementById('c');
export const engine = new BABYLON.Engine(canvas, true);
export const scene = new BABYLON.Scene(engine);

// Màu trời và ánh sáng lúc trời quang; fx/weather.js làm tối đi khi bão.
export const SKY_COLOR = [0.53, 0.72, 0.9];
scene.clearColor = new Color4(...SKY_COLOR, 1);
// Sương mù luôn bật (mật độ 0 lúc trời quang, fx/weather.js chỉ đổi mật độ): đổi fogMode lúc chạy làm MỌI material biên dịch lại shader, giật vài trăm ms.
scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
scene.fogDensity = 0;
const sky = new BABYLON.HemisphericLight('light', new Vector3(0.3, 1, 0.2), scene);
sky.intensity = 0.7;
const sun = new BABYLON.DirectionalLight('sun', new Vector3(-0.5, -1, -0.4), scene);
sun.intensity = 0.6; // nắng xiên làm nổi gò đồi
export const lights = { sky, sun, base: { sky: sky.intensity, sun: sun.intensity } };

export function solidMaterial(color, targetScene = scene) {
  const m = new StandardMaterial('m', targetScene);
  m.diffuseColor = color;
  m.specularColor = Color3.Black();
  return m;
}
