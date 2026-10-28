const { Vector3, Color3, MeshBuilder, StandardMaterial } = BABYLON;

const PUNCH_TIME = 0.25;
const PUNCH_COOLDOWN = 0.35;
const MOVE_SPEED = 6;
const EYE_HEIGHT = 1.7;
const CROUCH_EYE_HEIGHT = 1.15;
const SPRINT_MULT = 1.6;
const CROUCH_MULT = 0.5;
const JUMP_SPEED = 6.5;
const GRAVITY = 20;
const BASE_FOV = 1.1;
const MIN_DIST = 1.0; // khoảng cách tối thiểu giữa hai người chơi, khớp với server

const canvas = document.getElementById('c');
const pauseEl = document.getElementById('pause');
const hpFill = document.getElementById('hpfill');
const flash = document.getElementById('flash');
const deadText = document.getElementById('dead');
const board = document.getElementById('board');
const crosshair = document.getElementById('crosshair');

const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color4(0.53, 0.72, 0.9, 1);
new BABYLON.HemisphericLight('light', new Vector3(0.3, 1, 0.2), scene);
Fx.init(scene);

function solidMaterial(color) {
  const m = new StandardMaterial('m', scene);
  m.diffuseColor = color;
  m.specularColor = Color3.Black();
  return m;
}

// ---------- Sân đấu ----------
let arena = 20;
function buildArena(size) {
  arena = size;
  const ground = MeshBuilder.CreateGround('ground', { width: size * 2, height: size * 2 }, scene);
  const tex = new BABYLON.DynamicTexture('checker', 256, scene);
  const ctx = tex.getContext();
  ctx.fillStyle = '#4a6b4a';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#3d5a3d';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillRect(128, 128, 128, 128);
  tex.update();
  tex.uScale = tex.vScale = size / 2;
  const gm = new StandardMaterial('ground', scene);
  gm.diffuseTexture = tex;
  gm.specularColor = Color3.Black();
  ground.material = gm;

  const wallMat = solidMaterial(new Color3(0.6, 0.55, 0.5));
  [[0, size, size * 2, 0.5], [0, -size, size * 2, 0.5], [size, 0, 0.5, size * 2], [-size, 0, 0.5, size * 2]]
    .forEach(([x, z, w, d]) => {
      const wall = MeshBuilder.CreateBox('wall', { width: w, height: 3, depth: d }, scene);
      wall.position.set(x, 1.5, z);
      wall.material = wallMat;
    });
}

// ---------- Nắm đấm (dùng chung cho mình và người khác) ----------
class Fist {
  constructor(parent, rest, reach, material, size) {
    this.rest = rest;
    this.reach = reach;
    this.t = 0;
    this.mesh = MeshBuilder.CreateSphere('fist', { diameter: 1 }, scene);
    this.mesh.scaling.set(size, size, size * 1.3);
    this.mesh.material = material;
    this.mesh.parent = parent;
    this.mesh.position.copyFrom(rest);
  }
  punch() {
    this.t = PUNCH_TIME;
  }
  update(dt) {
    if (this.t > 0) this.t = Math.max(0, this.t - dt);
    const k = Math.sin(Math.PI * (1 - this.t / PUNCH_TIME)) * (this.t > 0 ? 1 : 0);
    this.mesh.position.copyFrom(this.rest).addInPlace(this.reach.scale(k));
  }
}

// ---------- Người chơi ----------
let myId = null;
let alive = true;
let hp = 100;
let maxHp = 100;
let yaw = 0;
let pitch = 0;
const me = { x: 0, y: 0, z: 0 }; // y là độ cao của chân (0 khi đứng trên sân)
let vy = 0;
let crouching = false;
let crouchAmount = 0; // 0 đứng → 1 ngồi hẳn, đổi mượt theo thời gian
let sprinting = false;
let sprintFov = 0;
let fovKick = 0;
let shake = 0;
const remotes = new Map();

const camera = new BABYLON.UniversalCamera('cam', new Vector3(0, EYE_HEIGHT, 0), scene);
camera.inputs.clear();
camera.minZ = 0.05;
camera.fov = BASE_FOV;

const handMat = solidMaterial(new Color3(0.95, 0.75, 0.6));
const myFists = {
  L: new Fist(camera, new Vector3(-0.35, -0.35, 0.7), new Vector3(0.25, 0.15, 0.9), handMat, 0.22),
  R: new Fist(camera, new Vector3(0.35, -0.35, 0.7), new Vector3(-0.25, 0.15, 0.9), handMat, 0.22),
};

// ---------- Ngoại hình người chơi khác (sinh từ code) ----------
function part(mesh, parent, x, y, z, material) {
  mesh.parent = parent;
  mesh.position.set(x, y, z);
  mesh.material = material;
  return mesh;
}

const box = (w, h, d) => MeshBuilder.CreateBox('box', { width: w, height: h, depth: d }, scene);
const ball = (d) => MeshBuilder.CreateSphere('ball', { diameter: d }, scene);

// Áo có hoạ tiết: 0 trơn, 1 sọc ngang, 2 sọc dọc, 3 ca-rô, 4 chấm bi.
function patternMaterial(id, pattern, base, accent) {
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
  const m = new StandardMaterial('shirt' + id, scene);
  m.diffuseTexture = tex;
  m.specularColor = Color3.Black();
  return m;
}

// Tay: vai và khuỷu tay là hai khớp xoay. Thế thủ co khuỷu, khi đấm duỗi thẳng ra phía trước.
class Arm {
  constructor(parent, side, sleeveMat, skinMat, gloveMat) {
    this.side = side; // -1 tay trái, +1 tay phải
    this.t = 0;
    this.shoulder = new BABYLON.TransformNode('shoulder', scene);
    this.shoulder.parent = parent;
    this.shoulder.position.set(side * 0.47, 1.3, 0);
    part(box(0.24, 0.38, 0.24), this.shoulder, 0, -0.19, 0, sleeveMat);

    this.elbow = new BABYLON.TransformNode('elbow', scene);
    this.elbow.parent = this.shoulder;
    this.elbow.position.y = -0.38;
    part(box(0.18, 0.38, 0.18), this.elbow, 0, -0.19, 0, skinMat);
    part(ball(0.34), this.elbow, 0, -0.47, 0, gloveMat);
    this.update(0);
  }
  punch() {
    this.t = PUNCH_TIME;
  }
  update(dt) {
    if (this.t > 0) this.t = Math.max(0, this.t - dt);
    const k = this.t > 0 ? Math.sin(Math.PI * (1 - this.t / PUNCH_TIME)) : 0;
    this.shoulder.rotation.x = -0.4 - 1.1 * k;
    this.shoulder.rotation.z = -this.side * (0.15 - 0.1 * k);
    this.shoulder.position.z = 0.15 * k;
    this.elbow.rotation.x = -1.9 + 1.85 * k;
  }
}

// Bảng tên luôn quay về phía camera, đặt trong node `parent` (cùng node với thanh máu).
function createNameTag(name, parent) {
  const tex = new BABYLON.DynamicTexture('nameTex', { width: 512, height: 96 }, scene, true);
  tex.hasAlpha = true;
  const ctx = tex.getContext();
  ctx.font = 'bold 56px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.strokeText(name, 256, 48, 500);
  ctx.fillStyle = '#fff';
  ctx.fillText(name, 256, 48, 500);
  tex.update();

  const mat = new StandardMaterial('nameMat', scene);
  mat.emissiveTexture = tex;
  mat.opacityTexture = tex;
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  const plane = MeshBuilder.CreatePlane('nameTag', { width: 1.6, height: 0.3 }, scene);
  plane.parent = parent;
  plane.position.set(0, 0.22, -0.01);
  plane.material = mat;
}

function createRemote(id, { name, look }) {
  const root = new BABYLON.TransformNode('remote' + id, scene);
  const shirtColor = Color3.FromHexString(look.shirt);
  const luminance = 0.299 * shirtColor.r + 0.587 * shirtColor.g + 0.114 * shirtColor.b;
  const patternColor = Color3.Lerp(shirtColor, luminance > 0.6 ? Color3.Black() : Color3.White(), 0.45);
  const accentMat = solidMaterial(Color3.FromHexString(look.glove)); // găng tay, thắt lưng
  const skinMat = solidMaterial(Color3.FromHexString(look.skin));
  const sleeveMat = solidMaterial(shirtColor);
  const pantsMat = solidMaterial(Color3.FromHexString(look.pants));
  const darkMat = solidMaterial(new Color3(0.08, 0.08, 0.1));
  const whiteMat = solidMaterial(Color3.White());

  const legs = [-1, 1].map((side) => {
    const hip = new BABYLON.TransformNode('hip', scene);
    hip.parent = root;
    hip.position.set(side * 0.17, 0.72, 0);
    part(box(0.28, 0.66, 0.3), hip, 0, -0.33, 0, pantsMat);
    part(box(0.3, 0.12, 0.4), hip, 0, -0.66, 0.05, darkMat);
    return hip;
  });

  // Phần thân trên nằm trong `upper` để hạ thấp xuống khi người chơi ngồi
  const upper = new BABYLON.TransformNode('upper', scene);
  upper.parent = root;

  part(box(0.7, 0.68, 0.38), upper, 0, 1.04, 0, patternMaterial(id, look.pattern, shirtColor.toHexString(), patternColor.toHexString()));
  part(box(0.72, 0.08, 0.4), upper, 0, 0.74, 0, accentMat);

  const head = new BABYLON.TransformNode('head', scene);
  head.parent = upper;
  head.position.y = 1.62;
  part(ball(0.52), head, 0, 0, 0, skinMat);
  part(ball(0.56), head, 0, 0.16, -0.06, solidMaterial(Color3.FromHexString(look.hair))).scaling.y = 0.5;
  for (const side of [-1, 1]) {
    part(ball(0.1), head, side * 0.09, 0.04, 0.235, whiteMat);
    part(ball(0.05), head, side * 0.09, 0.04, 0.27, darkMat);
    // lông mày chếch xuống phía mũi cho có vẻ hung dữ
    part(box(0.1, 0.025, 0.02), head, side * 0.09, 0.11, 0.225, darkMat).rotation.z = -side * 0.3;
  }
  part(ball(0.07), head, 0, -0.02, 0.27, skinMat);
  part(box(0.12, 0.02, 0.02), head, 0, -0.11, 0.235, solidMaterial(new Color3(0.55, 0.15, 0.15)));

  const fists = {
    L: new Arm(upper, -1, sleeveMat, skinMat, accentMat),
    R: new Arm(upper, 1, sleeveMat, skinMat, accentMat),
  };

  const bar = new BABYLON.TransformNode('bar', scene);
  bar.parent = upper;
  bar.position.y = 2.3;
  bar.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  const back = MeshBuilder.CreatePlane('barBack', { width: 1.1, height: 0.14 }, scene);
  back.parent = bar;
  back.material = solidMaterial(Color3.Black());
  back.material.disableLighting = true;
  const fill = MeshBuilder.CreatePlane('barFill', { width: 1, height: 0.1 }, scene);
  fill.parent = bar;
  fill.position.z = -0.01;
  fill.material = solidMaterial(new Color3(0.2, 0.9, 0.2));
  fill.material.emissiveColor = new Color3(0.2, 0.9, 0.2);
  createNameTag(name, bar);

  return {
    root, upper, fists, legs, fill,
    phase: 0, crouch: 0, tx: 0, ty: 0, tz: 0, tc: 0, tyaw: 0,
    hp: 100, dead: false, initialised: false,
  };
}

function disposeRemote(r) {
  r.root.dispose(false, true); // xoá luôn material và texture riêng của người này
}

function updateRemote(r, dt) {
  const f = 1 - Math.exp(-15 * dt);
  const ox = r.root.position.x;
  const oz = r.root.position.z;
  r.root.position.x += (r.tx - r.root.position.x) * f;
  r.root.position.z += (r.tz - r.root.position.z) * f;
  // Chân bước theo tốc độ di chuyển
  const speed = dt > 0 ? Math.hypot(r.root.position.x - ox, r.root.position.z - oz) / dt : 0;
  r.phase += speed * dt * 3;
  r.root.position.y += (r.ty - r.root.position.y) * f;
  // Ngồi: hạ thân trên xuống 0.35 và co ngắn chân lại cho vừa
  r.crouch += (r.tc - r.crouch) * f;
  r.upper.position.y = -0.35 * r.crouch;
  const legScale = (0.72 - 0.35 * r.crouch) / 0.72;
  const swing = Math.sin(r.phase) * 0.7 * Math.min(speed / 3, 1) * (1 - 0.7 * r.crouch);
  r.legs[0].rotation.x = swing;
  r.legs[1].rotation.x = -swing;
  for (const leg of r.legs) {
    leg.position.y = 0.72 * legScale;
    leg.scaling.y = legScale;
  }
  let dy = r.tyaw - r.root.rotation.y;
  dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  r.root.rotation.y += dy * f;
  r.fists.L.update(dt);
  r.fists.R.update(dt);
  const pct = Math.max(0, r.hp) / maxHp;
  r.fill.scaling.x = Math.max(pct, 0.001);
  r.fill.position.x = -0.5 * (1 - pct);
  r.root.setEnabled(!r.dead);
}

// ---------- Mạng ----------
let ws = null;
const send = (msg) => ws?.readyState === WebSocket.OPEN && ws.send(JSON.stringify(msg));
const infos = new Map(); // id → { id, name, look } của mọi người chơi trong sân

function showPause(title, text) {
  document.getElementById('pause-title').textContent = title;
  document.getElementById('pause-text').textContent = text;
  pauseEl.style.display = 'flex';
  document.exitPointerLock();
}

function connect(name, look) {
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
  ws.onopen = () => send({ t: 'join', name, look });
  ws.onclose = () => showPause('Mất kết nối', 'Tải lại trang (F5) để vào lại');
  ws.onmessage = handleMessage;
}

const handleMessage = (e) => {
  const m = JSON.parse(e.data);
  switch (m.t) {
    case 'welcome':
      myId = m.id;
      maxHp = m.maxHp;
      buildArena(m.arena);
      me.x = m.x;
      me.z = m.z;
      for (const o of m.players) infos.set(o.id, o);
      break;
    case 'join':
      infos.set(m.id, m);
      break;
    case 'setpos':
      me.x = m.x;
      me.z = m.z;
      me.y = 0;
      vy = 0;
      break;
    case 'snap':
      applySnapshot(m.players);
      break;
    case 'punch': {
      const r = remotes.get(m.id);
      if (m.id !== myId && r) {
        r.fists[m.hand].punch();
        Sfx.at('whoosh', r.root.position.x, r.root.position.z, me.x, me.z, yaw);
      }
      break;
    }
    case 'hit': {
      const victim = m.id === myId ? me : remotes.get(m.id)?.root.position;
      if (victim) Sfx.at('impact', victim.x, victim.z, me.x, me.z, yaw);
      if (m.id === myId) {
        shake = Math.max(shake, 0.12);
        flash.style.transition = 'none';
        flash.style.opacity = 0.35;
        requestAnimationFrame(() => {
          flash.style.transition = 'opacity .25s';
          flash.style.opacity = 0;
        });
      } else {
        const target = remotes.get(m.id);
        const attacker = m.by === myId ? me : remotes.get(m.by)?.root.position;
        if (target && attacker) spawnHitEffects(target, attacker, m.dmg);
        if (m.by === myId) {
          shake = Math.max(shake, 0.04);
          crosshair.classList.add('hit');
          setTimeout(() => crosshair.classList.remove('hit'), 150);
        }
      }
      break;
    }
    case 'leave':
      if (remotes.has(m.id)) disposeRemote(remotes.get(m.id));
      remotes.delete(m.id);
      infos.delete(m.id);
      break;
  }
};

// Tia lửa + ngôi sao ở ngực nạn nhân (lệch về phía người đấm cho dễ thấy) và số sát thương bay lên.
function spawnHitEffects(target, attacker, damage) {
  const pos = target.root.position;
  const dx = attacker.x - pos.x;
  const dz = attacker.z - pos.z;
  const len = Math.hypot(dx, dz) || 1;
  const x = pos.x + (dx / len) * 0.35;
  const z = pos.z + (dz / len) * 0.35;
  const y = pos.y + 1.3 - 0.35 * target.crouch;
  Fx.burst(x, y, z, 12);
  Fx.flash(x, y, z);
  // Số sát thương dịch sang bên phải (theo góc nhìn của mình) để không bị thanh máu che
  Fx.damageText(
    pos.x + Math.cos(yaw) * 0.8,
    pos.y + 1.8 - 0.35 * target.crouch,
    pos.z - Math.sin(yaw) * 0.8,
    `-${damage ?? 10}`,
  );
}

function applySnapshot(list) {
  const seen = new Set();
  for (const p of list) {
    seen.add(p.id);
    if (p.id === myId) {
      if (alive && p.dead) Sfx.ko(0, 1);
      hp = p.hp;
      alive = !p.dead;
      continue;
    }
    let r = remotes.get(p.id);
    if (!r) {
      const info = infos.get(p.id);
      if (!info) continue;
      r = createRemote(p.id, info);
      remotes.set(p.id, r);
    }
    r.tx = p.x;
    r.ty = p.y;
    r.tz = p.z;
    r.tc = p.c;
    r.tyaw = p.yaw;
    r.hp = p.hp;
    if (!r.dead && p.dead) Sfx.at('ko', r.root.position.x, r.root.position.z, me.x, me.z, yaw);
    r.dead = p.dead;
    if (!r.initialised) {
      r.root.position.set(p.x, p.y, p.z);
      r.root.rotation.y = p.yaw;
      r.initialised = true;
    }
  }
  for (const [id, r] of remotes) {
    if (!seen.has(id)) {
      disposeRemote(r);
      remotes.delete(id);
    }
  }
  hpFill.style.width = `${(Math.max(0, hp) / maxHp) * 100}%`;
  deadText.style.display = alive ? 'none' : 'block';
  // Tên do người chơi tự nhập nên dùng textContent, không dùng innerHTML.
  const title = document.createElement('b');
  title.textContent = 'Điểm hạ gục';
  const rows = list
    .slice()
    .sort((a, b) => b.kills - a.kills)
    .map((p) => {
      const row = document.createElement('div');
      row.textContent = `${p.id === myId ? '▶ ' : ''}${infos.get(p.id)?.name ?? '...'}: ${p.kills}`;
      return row;
    });
  board.replaceChildren(title, ...rows);
}

setInterval(() => {
  if (myId !== null && alive) send({ t: 'state', x: me.x, z: me.z, yaw, y: me.y, c: crouching ? 1 : 0 });
}, 50);

// ---------- Input ----------
const keys = new Set();
addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return; // đang gõ tên
  if (e.code === 'Space') e.preventDefault();
  keys.add(e.code);
  if (e.code === 'KeyM') Sfx.toggleMute();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

let joined = false;
Menu.init((name, look) => {
  joined = true;
  handMat.diffuseColor = Color3.FromHexString(look.glove); // tay của mình cũng đeo găng đã chọn
  Sfx.init();
  connect(name, look);
  canvas.requestPointerLock();
});
pauseEl.addEventListener('click', () => canvas.requestPointerLock());
document.addEventListener('pointerlockchange', () => {
  if (joined) pauseEl.style.display = document.pointerLockElement === canvas ? 'none' : 'flex';
});

document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== canvas) return;
  yaw += e.movementX * 0.0022;
  pitch = Math.max(-1.4, Math.min(1.4, pitch + e.movementY * 0.0022));
});

let cooldown = 0;
canvas.addEventListener('mousedown', (e) => {
  if (document.pointerLockElement !== canvas || !alive || cooldown > 0) return;
  if (e.button !== 0 && e.button !== 2) return;
  const hand = e.button === 0 ? 'L' : 'R';
  cooldown = PUNCH_COOLDOWN;
  fovKick = 0.07; // giật nhẹ góc nhìn khi vung tay
  myFists[hand].punch();
  Sfx.whoosh(0, 1);
  send({ t: 'punch', hand });
});

// ---------- Vòng lặp ----------
scene.onBeforeRenderObservable.add(() => {
  const dt = Math.min(engine.getDeltaTime() / 1000, 0.1);
  cooldown = Math.max(0, cooldown - dt);

  if (alive && myId !== null) {
    const fwd = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
    const strafe = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
    const len = Math.hypot(fwd, strafe) || 1;
    const moving = fwd !== 0 || strafe !== 0;
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);

    crouching = keys.has('KeyC');
    sprinting = moving && !crouching && (keys.has('ShiftLeft') || keys.has('ShiftRight'));
    const speed = MOVE_SPEED * (sprinting ? SPRINT_MULT : crouching ? CROUCH_MULT : 1);
    me.x += ((sin * fwd + cos * strafe) / len) * speed * dt * (moving ? 1 : 0);
    me.z += ((cos * fwd - sin * strafe) / len) * speed * dt * (moving ? 1 : 0);

    // Nhảy: chỉ khi đang đứng trên sân và không ngồi
    if (keys.has('Space') && me.y === 0 && !crouching) vy = JUMP_SPEED;
    vy -= GRAVITY * dt;
    me.y += vy * dt;
    if (me.y <= 0) {
      me.y = 0;
      vy = 0;
    }
    for (const r of remotes.values()) {
      if (r.dead) continue;
      const dx = me.x - r.root.position.x;
      const dz = me.z - r.root.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist >= MIN_DIST) continue;
      const nx = dist > 1e-4 ? dx / dist : 1;
      const nz = dist > 1e-4 ? dz / dist : 0;
      me.x = r.root.position.x + nx * MIN_DIST;
      me.z = r.root.position.z + nz * MIN_DIST;
    }
    me.x = Math.max(-arena + 0.5, Math.min(arena - 0.5, me.x));
    me.z = Math.max(-arena + 0.5, Math.min(arena - 0.5, me.z));
  }

  if (!alive) {
    crouching = false;
    sprinting = false;
  }
  crouchAmount += ((crouching ? 1 : 0) - crouchAmount) * (1 - Math.exp(-14 * dt));
  const eye = EYE_HEIGHT + (CROUCH_EYE_HEIGHT - EYE_HEIGHT) * crouchAmount;

  // Rung camera khi trúng đòn; giãn góc nhìn khi chạy nhanh và khi vung tay
  shake *= Math.exp(-14 * dt);
  fovKick *= Math.exp(-10 * dt);
  sprintFov += ((sprinting ? 0.12 : 0) - sprintFov) * (1 - Math.exp(-8 * dt));
  camera.fov = BASE_FOV + sprintFov + fovKick;
  const jitter = () => (Math.random() - 0.5) * 2 * shake;
  camera.position.set(me.x + jitter() * 0.5, me.y + eye + jitter() * 0.5, me.z + jitter() * 0.5);
  camera.rotation.set(pitch + jitter(), yaw + jitter(), jitter() * 0.5);
  myFists.L.mesh.setEnabled(alive);
  myFists.R.mesh.setEnabled(alive);
  myFists.L.update(dt);
  myFists.R.update(dt);
  for (const r of remotes.values()) updateRemote(r, dt);
  Fx.update(dt);
});

engine.runRenderLoop(() => scene.render());
addEventListener('resize', () => engine.resize());
