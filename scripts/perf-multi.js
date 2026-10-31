// Đo hiệu năng nhiều người chơi (xem docs/perf.md): server thật + N bot WebSocket (đuổi nhau, nhặt hòm, đánh / bắn / ném) + một người quan sát là
// trang trình duyệt Chromium (bảng F3 bật sẵn, camera đặt cố định trên cao). Pha 1: quan sát viên đứng một mình; pha 2: bot vào, đo lại ở cùng
// góc nhìn; sau đó tắt thử từng nhóm mesh để biết nhóm nào tốn bao nhiêu. In ra bảng so sánh, profile CPU của luồng chính và số mesh / material tăng.
//
// Cần playwright-core cài KHÔNG ghi vào package.json:  npm install --no-save playwright-core
// Trình duyệt: biến môi trường BROWSER_PATH (mặc định Brave trên Windows). Chạy headless bằng GPU phần mềm nên số ms tuyệt đối cao hơn máy thật:
// chỉ so sánh trước / sau cùng một máy, đừng đọc như FPS thật.
// Usage: node scripts/perf-multi.js [bots=5] [map=default] [port=3120] [ảnh-chụp.png]
const { spawn, execSync } = require('child_process');
const path = require('path');
const { chromium } = require('playwright-core');

const PROJECT = path.join(__dirname, '..');
const WebSocket = require(path.join(PROJECT, 'node_modules', 'ws'));
const BRAVE = process.env.BROWSER_PATH ?? path.join(process.env.LOCALAPPDATA ?? '', 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe');
const BOTS = Number(process.argv[2] ?? 5);
const MAP = process.argv[3] ?? 'default';
const PORT = Number(process.argv[4] ?? 3120);
const BASE_MS = 14000;
const LOAD_MS = 45000;
const SAMPLE_MS = 2000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function startServer() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      path.join(PROJECT, 'server', 'index.js'), '--test=1', '--single-room=1', '--auto-ready=1', '--min-players=1',
      `--map=${MAP}`, '--match-seconds=900', '--event-first-seconds=3000',
    ], { cwd: PROJECT, env: { ...process.env, PORT: String(PORT) } });
    child.stdout.on('data', (d) => { if (String(d).includes('Game chạy')) resolve(child); });
    child.on('error', reject);
    setTimeout(() => reject(new Error('server không lên')), 8000);
  });
}

const cpuSeconds = (pid) => Number(execSync(`powershell -NoProfile -Command "(Get-Process -Id ${pid}).TotalProcessorTime.TotalSeconds"`).toString().trim());

// ---- bot ----
function startBot(index, stats) {
  const ws = new WebSocket(`ws://localhost:${PORT}`);
  const bot = { me: { x: 0, z: 0, y: 0, yaw: 0 }, others: new Map(), pickups: new Map(), weapons: {}, own: null, size: 80, lastAct: 0, hand: 'L', lastReload: 0 };
  const send = (m) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(m));
  ws.on('open', () => send({ t: 'join', name: `Bot${index}`, look: {}, create: true }));
  ws.on('message', (raw) => {
    stats.bytes += raw.length;
    const m = JSON.parse(raw);
    if (m.t === 'welcome') {
      bot.id = m.id; bot.me.x = m.x; bot.me.z = m.z; bot.weapons = m.weapons; bot.size = m.map.size;
      for (const p of m.pickups) bot.pickups.set(p.id, p);
    } else if (m.t === 'snap') {
      bot.others.clear();
      for (const p of m.players) { if (p.id === bot.id) { bot.own = p; bot.me.y = p.y; } else bot.others.set(p.id, p); }
    } else if (m.t === 'airdrop' || m.t === 'drop') bot.pickups.set(m.pickup.id, { ...m.pickup, seenAt: Date.now() });
    else if (m.t === 'pickup') bot.pickups.delete(m.id);
    else if (m.t === 'setpos') { bot.me.x = m.x ?? bot.me.x; bot.me.z = m.z ?? bot.me.z; }
  });
  const timer = setInterval(() => tick(bot, send), 50);
  return { close() { clearInterval(timer); ws.close(); } };
}

function tick(bot, send) {
  if (!bot.own || bot.own.dead) return;
  const now = Date.now();
  const me = bot.me;
  let target = null;
  let best = Infinity;
  for (const o of bot.others.values()) {
    if (o.dead) continue;
    const d = Math.hypot(o.x - me.x, o.z - me.z);
    if (d < best) { best = d; target = { x: o.x, z: o.z, kind: 'player', d }; }
  }
  for (const p of bot.pickups.values()) { // hòm đã chạm đất (hoặc vũ khí rơi sẵn) gần hơn người thì đi nhặt
    if (!p.dropped && p.seenAt && now < p.seenAt + p.landIn) continue;
    const d = Math.hypot(p.x - me.x, p.z - me.z);
    if (d < 40 && d < best + 10) { best = d; target = { x: p.x, z: p.z, kind: 'pickup', d }; }
  }
  if (!target) return;
  const dx = target.x - me.x;
  const dz = target.z - me.z;
  me.yaw = Math.atan2(dx, dz);
  const stop = target.kind === 'player' ? 2 : 0.2;
  if (target.d > stop) {
    const step = Math.min(target.d - stop, 7 * 0.05);
    const limit = bot.size - 1;
    me.x = Math.max(-limit, Math.min(limit, me.x + (dx / target.d) * step));
    me.z = Math.max(-limit, Math.min(limit, me.z + (dz / target.d) * step));
  }
  send({ t: 'state', x: me.x, z: me.z, yaw: me.yaw, y: me.y, c: 0, s: 0 });
  if (target.kind !== 'player') return;
  const info = bot.weapons[bot.own.w] ?? bot.weapons.fist;
  if (now - bot.lastAct < (info.cooldown ?? 400)) return;
  if (info.kind === 'melee' && target.d < (info.range ?? 2.2) + 0.5) {
    bot.hand = bot.hand === 'L' ? 'R' : 'L';
    send({ t: 'punch', hand: bot.hand });
    bot.lastAct = now;
  } else if ((info.kind === 'gun' || info.kind === 'rocket') && target.d < 45) {
    if (info.magazineSize && bot.own.mg === 0) {
      if (now - bot.lastReload > 2500) { send({ t: 'reload' }); bot.lastReload = now; }
    } else { send({ t: 'fire', yaw: me.yaw, pitch: 0 }); bot.lastAct = now; }
  } else if (info.kind === 'throwable' && target.d > 6 && target.d < 22) {
    send({ t: 'throw', yaw: me.yaw, pitch: 0.2, soft: false });
    bot.lastAct = now;
  }
}

// ---- đọc bảng F3 ----
function parsePerf(text) {
  const lines = text.split('\n');
  const num = (re, line, i = 1) => Number(re.exec(line)?.[i] ?? NaN);
  const tri = /tam giác ([\d.]+)(k|M)?/.exec(lines[3] ?? '');
  const sections = {};
  for (const line of lines.slice(6)) { const m = /^(\S+)\s+([\d.]+)\s+\(max ([\d.]+)\)/.exec(line); if (m) sections[m[1]] = Number(m[2]); }
  return {
    fps: num(/FPS (\d+)/, lines[0]), frame: num(/khung ([\d.]+)ms/, lines[0]), frameMax: num(/tệ nhất ([\d.]+)ms/, lines[0]),
    js: num(/JS cập nhật ([\d.]+)ms/, lines[1]), jsMax: num(/tệ nhất ([\d.]+)ms/, lines[1]),
    pick: num(/chọn mesh ([\d.]+)ms/, lines[2]), draw: num(/vẽ ([\d.]+)ms/, lines[2]), gpu: num(/GPU ([\d.]+)ms/, lines[2]),
    calls: num(/Draw call (\d+)/, lines[3]), meshes: num(/mesh (\d+)\//, lines[3]), tris: tri ? Number(tri[1]) * (tri[2] === 'M' ? 1e6 : tri[2] === 'k' ? 1e3 : 1) : NaN,
    particles: num(/hạt (\d+)/, lines[3]), heap: num(/bộ nhớ JS (\d+)MB/, lines[4]), gc: num(/GC (\d+)/, lines[4]), sections,
  };
}

const avg = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
const max = (xs) => xs.length ? Math.max(...xs) : NaN;

function summarize(samples) {
  const keys = ['fps', 'frame', 'frameMax', 'js', 'jsMax', 'pick', 'draw', 'gpu', 'calls', 'meshes', 'tris', 'particles', 'heap'];
  const out = Object.fromEntries(keys.map((k) => [k, avg(samples.map((s) => s[k]).filter(Number.isFinite))]));
  out.frameWorst = max(samples.map((s) => s.frameMax).filter(Number.isFinite));
  out.gcPerMin = samples.length > 1 ? (samples.at(-1).gc - samples[0].gc) / ((samples.length - 1) * SAMPLE_MS / 60000) : 0;
  const names = new Set(samples.flatMap((s) => Object.keys(s.sections)));
  out.sections = [...names].map((n) => [n, avg(samples.map((s) => s.sections[n] ?? 0))]).sort((a, b) => b[1] - a[1]).slice(0, 8);
  return out;
}

// CPU profile của luồng chính qua CDP: tổng thời gian tự thân (self time) theo hàm, tách riêng GC / rảnh / native.
function analyzeProfile(profile) {
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const self = new Map();
  let total = 0;
  profile.samples.forEach((id, i) => {
    const dt = (profile.timeDeltas[i] ?? 0) / 1000;
    const n = byId.get(id);
    const cf = n.callFrame;
    const key = cf.functionName === '(garbage collector)' || cf.functionName === '(idle)' || cf.functionName === '(program)' || cf.functionName === '(root)'
      ? cf.functionName : `${cf.functionName || '(ẩn danh)'} ${cf.url.split('/').slice(-2).join('/')}:${cf.lineNumber + 1}`;
    self.set(key, (self.get(key) ?? 0) + dt);
    total += dt;
  });
  // Chuỗi gọi hàm (từ ngoài vào trong) của các hàm đáng ngờ: ai gọi chúng và tốn bao nhiêu ms.
  const parent = new Map();
  for (const n of profile.nodes) for (const child of n.children ?? []) parent.set(child, n.id);
  const chainOf = (id) => { const names = []; for (let cur = id; cur; cur = parent.get(cur)) { const cf = byId.get(cur).callFrame; if (cf.functionName && !cf.functionName.startsWith('(')) names.unshift(cf.functionName); } return names.slice(-7).join(' > '); };
  const selfByNode = new Map();
  profile.samples.forEach((id, i) => selfByNode.set(id, (selfByNode.get(id) ?? 0) + (profile.timeDeltas[i] ?? 0) / 1000));
  const watched = ['_markAllSubMeshesAsDirty', 'getProgramParameter', 'getUniformBlockIndex', 'markAsDirty', 'markAllMaterialsAsDirty'];
  const callers = new Map();
  for (const [id, ms] of selfByNode) {
    const fn = byId.get(id).callFrame.functionName;
    if (!watched.includes(fn)) continue;
    const key = fn + ' <= ' + chainOf(parent.get(id));
    callers.set(key, (callers.get(key) ?? 0) + ms);
  }
  return { total, rows: [...self].sort((a, b) => b[1] - a[1]), callers: [...callers].sort((a, b) => b[1] - a[1]).slice(0, 10) };
}

async function collect(page, ms) {
  const samples = [];
  for (let t = 0; t < ms; t += SAMPLE_MS) {
    await sleep(SAMPLE_MS);
    const sample = parsePerf(await page.evaluate(() => document.getElementById('perf').textContent));
    sample.t = t;
    samples.push(sample);
  }
  return samples;
}

(async () => {
  const server = await startServer();
  const botStats = { bytes: 0 };
  const bots = [];
  const net = { bytes: 0, count: 0, byType: new Map() };
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: BRAVE, headless: true,
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--no-sandbox'],
    });
    const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    let counting = false;
    page.on('websocket', (ws) => ws.on('framereceived', ({ payload }) => {
      if (!counting) return;
      const text = typeof payload === 'string' ? payload : payload.toString();
      const type = /"t":"([a-z]+)"/.exec(text)?.[1] ?? '?';
      net.bytes += text.length; net.count++;
      const e = net.byType.get(type) ?? { bytes: 0, count: 0 };
      e.bytes += text.length; e.count++;
      net.byType.set(type, e);
    }));
    await page.goto(`http://localhost:${PORT}/?autoplay&perf`, { waitUntil: 'load' });
    await sleep(6000);
    // Góc nhìn cố định từ trên cao, thấy cả khu giữa sân nơi các bot đánh nhau.
    await page.evaluate(() => {
      const scene = BABYLON.EngineStore.Instances[0].scenes[0];
      scene.onBeforeRenderObservable.add(() => {
        scene.activeCamera.position.set(0, 38, -60);
        scene.activeCamera.rotation.set(0.5, 0, 0);
      });
    });
    console.log(`Pha 1: 1 người chơi (quan sát viên), ${BASE_MS / 1000}s`);
    const base = summarize(await collect(page, BASE_MS));

    console.log(`Pha 2: thêm ${BOTS} bot (tổng ${BOTS + 1} người), ${LOAD_MS / 1000}s`);
    for (let i = 0; i < BOTS; i++) bots.push(startBot(i + 1, botStats));
    await sleep(4000); // để bot vào phòng và bắt đầu đuổi nhau
    const cpu0 = cpuSeconds(server.pid);
    const t0 = Date.now();
    counting = true;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
    await cdp.send('Profiler.start');
    const loadedSamples = await collect(page, LOAD_MS);
    const { profile } = await cdp.send('Profiler.stop');
    const loaded = summarize(loadedSamples);
    const calm = summarize(loadedSamples.filter((s) => s.particles < 200));
    const storm = summarize(loadedSamples.filter((s) => s.particles >= 200));
    const counts = [loadedSamples.filter((s) => s.particles < 200).length, loadedSamples.filter((s) => s.particles >= 200).length];
    counting = false;
    const serverCpu = (cpuSeconds(server.pid) - cpu0) / ((Date.now() - t0) / 1000) * 100;
    await page.screenshot({ path: process.argv[5] ?? 'multi.png' });

    // Thí nghiệm đối chứng (bot vẫn đang chạy): tắt hiển thị từng nhóm mesh rồi đo lại để biết nhóm nào tốn bao nhiêu.
    const hide = (names) => page.evaluate((list) => {
      const scene = BABYLON.EngineStore.Instances[0].scenes[0];
      window.__hidden = scene.meshes.filter((m) => list.includes(m.name) && m.isVisible);
      window.__hidden.forEach((m) => { m.isVisible = false; });
      return window.__hidden.length;
    }, names);
    const restore = () => page.evaluate(() => { (window.__hidden ?? []).forEach((m) => { m.isVisible = true; }); window.__hidden = []; });
    const census = () => page.evaluate(() => {
      const scene = BABYLON.EngineStore.Instances[0].scenes[0];
      const count = (list) => { const by = {}; list.forEach((x) => { by[x.name] = (by[x.name] ?? 0) + 1; }); return by; };
      return { materials: count(scene.materials), textures: count(scene.textures), meshes: count(scene.meshes), geometries: scene.geometries.length };
    });
    const census1 = await census();
    await sleep(15000);
    const census2 = await census();
    const growth = (kind) => Object.entries(census2[kind]).map(([n, c]) => [n, census1[kind][n] ?? 0, c]).filter(([, a, b]) => b - a >= 3).sort((x, y) => (y[2] - y[1]) - (x[2] - x[1])).slice(0, 8);
    console.log('Tăng trong 15 giây (tên: trước → sau):');
    for (const kind of ['materials', 'textures', 'meshes']) console.log(`  ${kind}: ` + (growth(kind).map(([n, a, b]) => `${n} ${a}→${b}`).join(', ') || 'không tăng đáng kể'));
    const experiments = [];
    for (const [label, names] of [['tắt các quả cầu (bụi cây + đá)', ['ball']], ['tắt cả cây / bụi / đá / ghế / thùng', ['ball', 'cyl', 'box']]]) {
      const n = await hide(names);
      await sleep(2500);
      experiments.push([`${label} (${n} mesh)`, summarize(await collect(page, 8000))]);
      await restore();
    }

    const f = (n, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : 'n/a');
    const row = (label, k, d = 1) => console.log(`${label.padEnd(26)} ${f(base[k], d).padStart(9)} ${f(loaded[k], d).padStart(9)}`);
    console.log(`\n=== ${MAP}: ${BOTS + 1} người (tab quan sát chạy GPU phần mềm) ===`);
    console.log(`${''.padEnd(26)} ${'1 người'.padStart(9)} ${(BOTS + 1 + ' người').padStart(9)}`);
    row('FPS', 'fps', 0); row('khung hình (ms)', 'frame'); row('khung tệ nhất (ms)', 'frameWorst');
    row('JS cập nhật (ms/khung)', 'js', 2); row('JS tệ nhất (ms)', 'jsMax', 2);
    row('chọn mesh (ms)', 'pick'); row('vẽ phía CPU (ms)', 'draw'); row('GPU (ms)', 'gpu');
    row('draw call', 'calls', 0); row('mesh đang vẽ', 'meshes', 0); row('tam giác', 'tris', 0); row('hạt', 'particles', 0); row('bộ nhớ JS (MB)', 'heap', 0);
    console.log('\nThí nghiệm tắt nhóm mesh (khung hình ms / draw call / tam giác):');
    console.log(`  ${'không tắt gì'.padEnd(52)} ${f(loaded.frame, 0).padStart(5)}  ${f(loaded.calls, 0).padStart(5)}  ${f(loaded.tris, 0).padStart(8)}`);
    for (const [label, g] of experiments) console.log(`  ${label.padEnd(52)} ${f(g.frame, 0).padStart(5)}  ${f(g.calls, 0).padStart(5)}  ${f(g.tris, 0).padStart(8)}`);
    console.log(`GC: ${f(base.gcPerMin)} → ${f(loaded.gcPerMin)} lần/phút`);
    console.log(`
Tách pha nhiều người theo thời tiết (${counts[0]} mẫu trời quang, ${counts[1]} mẫu đang bão):`);
    for (const [label, g] of [['trời quang', calm], ['đang bão', storm]]) {
      console.log(`  ${label.padEnd(10)} khung ${f(g.frame)}ms · JS ${f(g.js, 2)}ms · hạt ${f(g.particles, 0)} · draw call ${f(g.calls, 0)} · tệ nhất ${f(g.frameWorst)}ms`);
    }
    console.log('\nHàm cập nhật nặng nhất (ms/khung), 1 người → nhiều người:');
    const baseSec = new Map(base.sections);
    for (const [name, v] of loaded.sections) console.log(`  ${name.padEnd(22)} ${f(baseSec.get(name) ?? 0, 2).padStart(6)} → ${f(v, 2).padStart(6)}`);
    const prof = analyzeProfile(profile);
    console.log(`
CPU profile luồng chính (${f(prof.total / 1000)}s mẫu): top theo thời gian tự thân`);
    for (const [name, ms] of prof.rows.slice(0, 16)) console.log(`  ${f(ms / prof.total * 100).padStart(5)}%  ${f(ms, 0).padStart(6)}ms  ${name}`);
    console.log('\nAi gọi các hàm đáng ngờ (ms tự thân):');
    for (const [chain, ms] of prof.callers) console.log(`  ${f(ms, 0).padStart(5)}ms  ${chain}`);
    const secs = LOAD_MS / 1000;
    console.log(`\nMạng tới 1 client: ${f(net.bytes / secs / 1024)} KB/s, ${f(net.count / secs, 0)} tin/giây`);
    for (const [type, e] of [...net.byType].sort((a, b) => b[1].bytes - a[1].bytes).slice(0, 8)) {
      console.log(`  ${type.padEnd(12)} ${f(e.bytes / secs / 1024).padStart(6)} KB/s  ${f(e.count / secs, 1).padStart(6)} tin/giây`);
    }
    console.log(`Server: ${f(serverCpu, 1)}% một lõi CPU (đo trong pha 2)`);
    if (errors.length) console.log('LỖI TRÌNH DUYỆT:', errors.slice(0, 5));
  } finally {
    bots.forEach((b) => b.close());
    await browser?.close();
    server.kill();
  }
})().catch((e) => { console.error('Thất bại:', e.message); process.exit(1); });
