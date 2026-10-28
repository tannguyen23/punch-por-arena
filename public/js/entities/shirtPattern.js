// Vật liệu áo theo lựa chọn của người chơi: màu áo + hoạ tiết nổi hơn/tối hơn màu áo một chút.
export function shirtMaterial(scene, id, look) {
  const { Color3 } = BABYLON;
  const shirt = Color3.FromHexString(look.shirt);
  const luminance = 0.299 * shirt.r + 0.587 * shirt.g + 0.114 * shirt.b;
  const accent = Color3.Lerp(shirt, luminance > 0.6 ? Color3.Black() : Color3.White(), 0.45);
  return patternMaterial(scene, id, look.pattern, shirt.toHexString(), accent.toHexString());
}

// Áo có hoạ tiết: 0 trơn, 1 sọc ngang, 2 sọc dọc, 3 ca-rô, 4 chấm bi.
export function patternMaterial(scene, id, pattern, base, accent) {
  const size = 128;
  const tex = new BABYLON.DynamicTexture('shirt' + id, size, scene);
  const ctx = tex.getContext();
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = accent;
  for (let i = 0; i < 4 && pattern > 0; i++) {
    for (let j = 0; j < 4; j++) {
      const x = i * 32;
      const y = j * 32;
      switch (pattern) {
        case 1: if (i === 0) ctx.fillRect(0, y + 8, size, 16); break;
        case 2: if (j === 0) ctx.fillRect(x + 8, 0, 16, size); break;
        case 3: if ((i + j) % 2) ctx.fillRect(x, y, 32, 32); break;
        default:
          ctx.beginPath();
          ctx.arc(x + 16, y + 16, 9, 0, Math.PI * 2);
          ctx.fill();
      }
    }
  }
  tex.update();
  const m = new BABYLON.StandardMaterial('shirt' + id, scene);
  m.diffuseTexture = tex;
  m.specularColor = BABYLON.Color3.Black();
  return m;
}
