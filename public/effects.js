// Hiệu ứng khi đấm trúng: tia lửa, ngôi sao va chạm, số sát thương bay lên.
const Fx = (() => {
  const { MeshBuilder, StandardMaterial, Color3 } = BABYLON;
  const items = []; // { mesh, life, max, step(dt, k), ownMaterial }
  let scene = null;
  let sparkMat = null;
  let starMat = null;

  function init(s) {
    scene = s;

    sparkMat = new StandardMaterial('sparkMat', scene);
    sparkMat.emissiveColor = new Color3(1, 0.8, 0.25);
    sparkMat.disableLighting = true;

    // Ngôi sao 8 cánh vẽ bằng canvas
    const tex = new BABYLON.DynamicTexture('starTex', 128, scene, true);
    tex.hasAlpha = true;
    const ctx = tex.getContext();
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const r = i % 2 === 0 ? 60 : 26;
      const a = (i / 16) * Math.PI * 2;
      const x = 64 + Math.cos(a) * r;
      const y = 64 + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = '#ffe066';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#ff7a00';
    ctx.stroke();
    tex.update();
    starMat = textMaterial('starMat', tex);
  }

  function textMaterial(name, tex) {
    const mat = new StandardMaterial(name, scene);
    mat.emissiveTexture = tex;
    mat.opacityTexture = tex;
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    return mat;
  }

  function billboard(size, x, y, z, material) {
    const mesh = MeshBuilder.CreatePlane('fx', size, scene);
    mesh.material = material;
    mesh.position.set(x, y, z);
    mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    return mesh;
  }

  function burst(x, y, z, count = 12) {
    for (let i = 0; i < count; i++) {
      const mesh = MeshBuilder.CreateSphere('spark', { diameter: 0.1 + Math.random() * 0.08, segments: 4 }, scene);
      mesh.material = sparkMat;
      mesh.position.set(x, y, z);
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 3.5;
      const v = { x: Math.cos(angle) * speed, y: 1 + Math.random() * 3, z: Math.sin(angle) * speed };
      const max = 0.35 + Math.random() * 0.25;
      items.push({
        mesh,
        life: max,
        max,
        step(dt, k) {
          v.y -= 9 * dt;
          mesh.position.x += v.x * dt;
          mesh.position.y += v.y * dt;
          mesh.position.z += v.z * dt;
          mesh.scaling.setAll(Math.max(1 - k, 0.001));
        },
      });
    }
  }

  function flash(x, y, z) {
    const mesh = billboard({ size: 1 }, x, y, z, starMat);
    items.push({
      mesh,
      life: 0.22,
      max: 0.22,
      step(dt, k) {
        const s = k < 0.4 ? 0.25 + (k / 0.4) * 0.65 : 0.9 * (1 - (k - 0.4) / 0.6);
        mesh.scaling.setAll(Math.max(s, 0.001));
      },
    });
  }

  function damageText(x, y, z, text) {
    const tex = new BABYLON.DynamicTexture('dmgTex', { width: 256, height: 96 }, scene, true);
    tex.hasAlpha = true;
    const ctx = tex.getContext();
    ctx.font = 'bold 72px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#fff';
    ctx.strokeText(text, 128, 48);
    ctx.fillStyle = '#e53935';
    ctx.fillText(text, 128, 48);
    tex.update();

    const mat = textMaterial('dmgMat', tex);
    const mesh = billboard({ width: 0.9, height: 0.34 }, x, y, z, mat);
    items.push({
      mesh,
      ownMaterial: true,
      life: 0.8,
      max: 0.8,
      step(dt, k) {
        mesh.position.y += 1.4 * dt;
        mesh.scaling.setAll(1 + 0.3 * (1 - Math.min(k * 6, 1)));
        mat.alpha = k < 0.5 ? 1 : Math.max(1 - (k - 0.5) / 0.5, 0);
      },
    });
  }

  function update(dt) {
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.life -= dt;
      if (it.life <= 0) {
        it.mesh.dispose(false, !!it.ownMaterial);
        items.splice(i, 1);
      } else {
        it.step(dt, 1 - it.life / it.max);
      }
    }
  }

  return { init, burst, flash, damageText, update };
})();
