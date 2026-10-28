const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const ARENA = 20; // nửa cạnh sân (sân vuông 40x40)
const MAX_HP = 100;
const DAMAGE = 10;
const PUNCH_RANGE = 2.2;
const PUNCH_COS = Math.cos((35 * Math.PI) / 180);
const PUNCH_COOLDOWN = 350;
const RESPAWN_MS = 2000;
const TICK_MS = 50;
const MIN_DIST = 1.0; // khoảng cách tối thiểu giữa hai người chơi (bán kính 0.5 mỗi người)
const HARD_OVERLAP = 0.6; // chồng lấn sâu hơn mức này thì server mới can thiệp
const SPAWN_CLEARANCE = 2;

const STATIC = {
  '/': path.join(__dirname, 'public', 'index.html'),
  '/client.js': path.join(__dirname, 'public', 'client.js'),
  '/audio.js': path.join(__dirname, 'public', 'audio.js'),
  '/menu.js': path.join(__dirname, 'public', 'menu.js'),
  '/effects.js': path.join(__dirname, 'public', 'effects.js'),
  '/babylon.js': path.join(__dirname, 'node_modules', 'babylonjs', 'babylon.js'),
};
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

const server = http.createServer((req, res) => {
  const file = STATIC[req.url.split('?')[0]];
  if (req.url === '/favicon.ico') {
    res.writeHead(204).end();
    return;
  }
  if (!file) {
    res.writeHead(404).end('Not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] });
  fs.createReadStream(file).pipe(res);
});

const wss = new WebSocketServer({ server });
const players = new Map();
let nextId = 1;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function randomSpawn() {
  let pos;
  for (let i = 0; i < 10; i++) {
    pos = {
      x: (Math.random() * 2 - 1) * (ARENA - 3),
      z: (Math.random() * 2 - 1) * (ARENA - 3),
    };
    const crowded = [...players.values()].some(
      (o) => !o.dead && Math.hypot(o.x - pos.x, o.z - pos.z) < SPAWN_CLEARANCE,
    );
    if (!crowded) break;
  }
  return pos;
}

// Lưới an toàn: nếu client báo vị trí chồng sâu vào người khác thì đẩy ra và bắt client cập nhật lại.
function separate(p) {
  for (const o of players.values()) {
    if (o === p || o.dead) continue;
    const dx = p.x - o.x;
    const dz = p.z - o.z;
    const dist = Math.hypot(dx, dz);
    if (dist >= HARD_OVERLAP) continue;
    const nx = dist > 1e-4 ? dx / dist : 1;
    const nz = dist > 1e-4 ? dz / dist : 0;
    p.x = clamp(o.x + nx * MIN_DIST, -ARENA, ARENA);
    p.z = clamp(o.z + nz * MIN_DIST, -ARENA, ARENA);
    send(p.ws, { t: 'setpos', x: p.x, z: p.z });
  }
}

function send(ws, msg) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const p of players.values()) {
    if (p.ws.readyState === p.ws.OPEN) p.ws.send(data);
  }
}

function respawn(p) {
  Object.assign(p, randomSpawn(), { hp: MAX_HP, dead: false });
  send(p.ws, { t: 'setpos', x: p.x, z: p.z });
}

function handlePunch(p, hand) {
  const now = Date.now();
  if (p.dead || now - p.lastPunch < PUNCH_COOLDOWN) return;
  p.lastPunch = now;
  broadcast({ t: 'punch', id: p.id, hand });

  const fx = Math.sin(p.yaw);
  const fz = Math.cos(p.yaw);
  let target = null;
  let best = Infinity;
  for (const o of players.values()) {
    if (o === p || o.dead) continue;
    const dx = o.x - p.x;
    const dz = o.z - p.z;
    const dist = Math.hypot(dx, dz);
    if (dist > PUNCH_RANGE || dist < 1e-6) continue;
    if ((dx * fx + dz * fz) / dist < PUNCH_COS) continue;
    if (dist < best) {
      best = dist;
      target = o;
    }
  }
  if (!target) return;

  target.hp = Math.max(0, target.hp - DAMAGE);
  broadcast({ t: 'hit', id: target.id, by: p.id, hand, dmg: DAMAGE });
  if (target.hp === 0) {
    target.dead = true;
    p.kills++;
    setTimeout(() => players.has(target.id) && respawn(target), RESPAWN_MS);
  }
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const PATTERN_COUNT = 5;
const LOOK_DEFAULT = { shirt: '#e53935', pants: '#1a237e', glove: '#1e88e5', skin: '#f5c7a3', hair: '#1a120d' };

// Dữ liệu ngoại hình do client gửi lên nên phải kiểm tra lại, chỉ nhận mã màu hex và số hoạ tiết hợp lệ.
function sanitizeLook(look) {
  const out = {};
  for (const key of Object.keys(LOOK_DEFAULT)) {
    out[key] = HEX_COLOR.test(look?.[key]) ? look[key].toLowerCase() : LOOK_DEFAULT[key];
  }
  const pattern = look?.pattern;
  out.pattern = Number.isInteger(pattern) && pattern >= 0 && pattern < PATTERN_COUNT ? pattern : 0;
  return out;
}

function sanitizeName(name, id) {
  const clean = String(name ?? '')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .trim()
    .slice(0, 16);
  return clean || `Người chơi ${id}`;
}

const info = (p) => ({ id: p.id, name: p.name, look: p.look });

wss.on('connection', (ws) => {
  // Người chơi chỉ được thêm vào sân sau khi gửi 'join' (tên + ngoại hình từ màn hình chọn).
  const p = {
    id: nextId++,
    ws,
    x: 0,
    z: 0,
    y: 0, // độ cao khi nhảy
    c: 0, // 1 khi đang ngồi
    yaw: 0,
    hp: MAX_HP,
    dead: false,
    kills: 0,
    lastPunch: 0,
    joined: false,
    name: '',
    look: null,
  };

  ws.on('message', (raw) => {
    let m;
    try {
      m = JSON.parse(raw);
    } catch {
      return;
    }
    if (m.t === 'join') {
      if (p.joined) return;
      p.name = sanitizeName(m.name, p.id);
      p.look = sanitizeLook(m.look);
      Object.assign(p, randomSpawn());
      p.joined = true;
      players.set(p.id, p);
      send(ws, {
        t: 'welcome',
        id: p.id,
        x: p.x,
        z: p.z,
        arena: ARENA,
        maxHp: MAX_HP,
        players: [...players.values()].map(info),
      });
      for (const o of players.values()) {
        if (o !== p) send(o.ws, { t: 'join', ...info(p) });
      }
      return;
    }
    if (!p.joined) return;
    if (m.t === 'state' && !p.dead) {
      if (Number.isFinite(m.x) && Number.isFinite(m.z) && Number.isFinite(m.yaw)) {
        p.x = clamp(m.x, -ARENA, ARENA);
        p.z = clamp(m.z, -ARENA, ARENA);
        p.yaw = m.yaw;
        p.y = Number.isFinite(m.y) ? clamp(m.y, 0, 3) : 0;
        p.c = m.c ? 1 : 0;
        separate(p);
      }
    } else if (m.t === 'punch' && (m.hand === 'L' || m.hand === 'R')) {
      handlePunch(p, m.hand);
    }
  });

  ws.on('close', () => {
    if (!p.joined) return;
    players.delete(p.id);
    broadcast({ t: 'leave', id: p.id });
  });
});

setInterval(() => {
  if (players.size === 0) return;
  broadcast({
    t: 'snap',
    players: [...players.values()].map((p) => ({
      id: p.id,
      x: +p.x.toFixed(3),
      z: +p.z.toFixed(3),
      yaw: +p.yaw.toFixed(3),
      y: +p.y.toFixed(2),
      c: p.c,
      hp: p.hp,
      dead: p.dead,
      kills: p.kills,
    })),
  });
}, TICK_MS);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Game chạy tại http://localhost:${PORT}`);
});
