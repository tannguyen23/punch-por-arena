const { Vector3, Color3, Color4, StandardMaterial } = BABYLON;

export const canvas = document.getElementById('c');
export const engine = new BABYLON.Engine(canvas, true);
export const scene = new BABYLON.Scene(engine);

scene.clearColor = new Color4(0.53, 0.72, 0.9, 1);
const sky = new BABYLON.HemisphericLight('light', new Vector3(0.3, 1, 0.2), scene);
sky.intensity = 0.7;
new BABYLON.DirectionalLight('sun', new Vector3(-0.5, -1, -0.4), scene).intensity = 0.6; // nắng xiên làm nổi gò đồi

export function solidMaterial(color, targetScene = scene) {
  const m = new StandardMaterial('m', targetScene);
  m.diffuseColor = color;
  m.specularColor = Color3.Black();
  return m;
}
