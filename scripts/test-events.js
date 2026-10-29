#!/usr/bin/env node
// Chạy thử nhanh sự kiện ngẫu nhiên: chọn map, độ dài trận, danh sách sự kiện và thời lượng từng phần.
// Script bật server với chế độ test (map cố định, phòng dùng chung, tự sẵn sàng), in cấu hình rồi mở các tab `?autoplay`.
// Ví dụ: `npm run test:events -- --map=desert --events=dog,duel --match=90`.

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const { mapOptions } = require('../server/maps');

const KNOWN_EVENTS = ['dog', 'duel'];
const EVENT_NAMES = { dog: 'hoá chó', duel: 'solo võ đài' };
const GAP_SECONDS = 1.5;
const TAIL_SECONDS = 20; // events.js: sự kiện cuối phải xong trước khi hết trận ngần này

function printHelp() {
  console.log(`Cách dùng: npm run test:events -- [tuỳ chọn]

  --map=default         Map cố định (${mapOptions.map((m) => m.id).join(', ')}; "all" = xoay vòng tất cả)
  --events=dog,duel     Các sự kiện sẽ chạy, theo đúng thứ tự (${KNOWN_EVENTS.join(', ')})
  --match=90            Độ dài trận (giây)
  --first=2             Sự kiện đầu tiên bắt đầu sau bao nhiêu giây
  --count=2             Số sự kiện mỗi trận (mặc định bằng số mục ở --events)
  --players=3           Số người tối thiểu để bắt đầu (mặc định 3 nếu có solo, 1 nếu chỉ có chó)
  --tabs=3              Số tab tự mở (mặc định bằng --players)
  --port=3000           Cổng server
  --no-open             Không tự mở tab, chỉ in URL
  --intro=2             Thời gian đứng hình đọc luật mỗi sự kiện (giây)
  --dog=15              Thời gian chạy trốn của sự kiện hoá chó (giây)
  --bet=10 --round=6 --break=2 --finish=2
                        Các giai đoạn của solo võ đài (giây); --round chỉ là thời gian DỰ TÍNH mỗi hiệp để xếp lịch
                        (hiệp thật đánh tới khi một người hết máu)
  --stall=10            Solo võ đài: không ai trúng đòn ngần này giây thì hiệp tự kết thúc (chống treo)
`);
}

function fail(message) {
  console.error(`Lỗi: ${message}`);
  process.exit(1);
}

function positiveNumber(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) fail(`--${name} phải là số dương`);
  return number;
}

function parseArgs(argv) {
  const options = {
    map: 'default',
    events: ['dog', 'duel'],
    match: 90,
    first: 2,
    count: null,
    players: null,
    tabs: null,
    port: Number(process.env.PORT) || 3000,
    open: true,
    intro: 2,
    dog: 15,
    bet: 10,
    round: 6,
    stall: 10,
    break: 2,
    finish: 2,
  };

  for (const raw of argv) {
    if (raw === '--help' || raw === '-h') return { help: true };
    if (raw === '--no-open') { options.open = false; continue; }
    const [key, value] = raw.replace(/^--/, '').split('=');
    switch (key) {
      case 'map': options.map = value; break;
      case 'events': case 'event': options.events = value?.split(',').map((kind) => kind.trim()).filter(Boolean); break;
      case 'match': case 'seconds': options.match = positiveNumber(value, 'match'); break;
      case 'first': options.first = positiveNumber(value, 'first'); break;
      case 'count': options.count = positiveNumber(value, 'count'); break;
      case 'players': options.players = positiveNumber(value, 'players'); break;
      case 'tabs': options.tabs = positiveNumber(value, 'tabs'); break;
      case 'port': options.port = positiveNumber(value, 'port'); break;
      case 'open': options.open = value !== '0'; break;
      case 'intro': options.intro = positiveNumber(value, 'intro'); break;
      case 'dog': options.dog = positiveNumber(value, 'dog'); break;
      case 'bet': options.bet = positiveNumber(value, 'bet'); break;
      case 'round': options.round = positiveNumber(value, 'round'); break;
      case 'stall': options.stall = positiveNumber(value, 'stall'); break;
      case 'break': options.break = positiveNumber(value, 'break'); break;
      case 'finish': options.finish = positiveNumber(value, 'finish'); break;
      default: fail(`không hiểu tham số --${key}. Xem --help`);
    }
  }

  if (!Array.isArray(options.events) || options.events.length === 0) fail('--events phải có ít nhất một sự kiện');
  const unknown = options.events.filter((kind) => !KNOWN_EVENTS.includes(kind));
  if (unknown.length > 0) fail(`sự kiện không hợp lệ: ${unknown.join(', ')} (chỉ có ${KNOWN_EVENTS.join(', ')})`);
  if (options.map !== 'all' && !mapOptions.some((map) => map.id === options.map)) {
    fail(`không có map "${options.map}". Chọn một trong: ${mapOptions.map((map) => map.id).join(', ')}`);
  }

  if (options.players === null) options.players = options.events.includes('duel') ? 3 : 1;
  if (options.tabs === null) options.tabs = options.players;
  if (options.count === null) options.count = options.events.length;
  return options;
}

function eventLengths(options) {
  const dog = options.intro + options.dog;
  const duel = options.intro + options.bet + 3 * options.round + 2 * options.break + options.finish; // tối đa BO3
  return { dog, duel };
}

function describe(options) {
  const lengths = eventLengths(options);
  const names = options.events.map((kind) => EVENT_NAMES[kind]);
  const total = options.first
    + Array.from({ length: options.count }, (_, i) => lengths[options.events[i % options.events.length]])
      .reduce((sum, seconds) => sum + seconds, 0)
    + GAP_SECONDS * Math.max(0, options.count - 1);

  console.log(`\nCấu hình test:`);
  console.log(`  Map:            ${options.map === 'all' ? 'xoay vòng tất cả' : options.map}`);
  console.log(`  Trận:           ${options.match}s`);
  console.log(`  Sự kiện:        ${names.join(' → ')} (${options.count} sự kiện, bắt đầu sau ${options.first}s)`);
  console.log(`  Thời lượng:     chó ${lengths.dog}s · solo ${lengths.duel}s · nghỉ giữa ${GAP_SECONDS}s`);
  console.log(`  Người tối thiểu: ${options.players} · tab tự mở: ${options.open ? options.tabs : 0}`);

  const needed = Math.ceil(total + TAIL_SECONDS);
  if (options.match < needed) {
    console.log(`  Lưu ý:           trận ${options.match}s chỉ chứa khoảng ${Math.floor((options.match - TAIL_SECONDS - options.first) / (total / options.count))} sự kiện;`);
    console.log(`                   dùng --match=${needed} để chạy đủ ${options.count} sự kiện.`);
  }
  if (options.events.includes('duel') && options.players < 3) {
    console.log(`  Lưu ý:           solo cần 2 võ sĩ + 1 người xem; mở ít nhất 3 tab để thấy màn hình cược.`);
  }
  if (options.tabs < options.players) {
    console.log(`  Lưu ý:           cần ${options.players} tab mới đủ người bắt đầu; đang mở ${options.tabs}.`);
  }
}

function waitForServer(port, tries = 50) {
  return new Promise((resolve) => {
    const attempt = (left) => {
      const req = http.get({ host: '127.0.0.1', port, path: '/api/maps', timeout: 500 }, (res) => {
        res.resume();
        if (res.statusCode === 200) resolve(true);
        else retry(left);
      });
      req.on('error', () => retry(left));
      req.on('timeout', () => { req.destroy(); retry(left); });
    };
    const retry = (left) => {
      if (left <= 0) resolve(false);
      else setTimeout(() => attempt(left - 1), 200);
    };
    attempt(tries);
  });
}

function openUrl(url) {
  const [command, args] = process.platform === 'win32'
    ? ['explorer.exe', [url]]
    : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  const child = spawn(command, args, { detached: true, stdio: 'ignore' });
  child.on('error', () => {});
  child.unref();
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  describe(options);

  const serverArgs = [
    path.join(__dirname, '..', 'server', 'index.js'),
    `--min-players=${options.players}`,
    `--match-seconds=${options.match}`,
    `--event-first-seconds=${options.first}`,
    `--event-intro-seconds=${options.intro}`,
    `--event-gap-seconds=${GAP_SECONDS}`,
    `--event-count=${options.count}`,
    `--events=${options.events.join(',')}`,
    `--dog-seconds=${options.dog}`,
    `--duel-bet-seconds=${options.bet}`,
    `--duel-round-seconds=${options.round}`,
    `--duel-stall-seconds=${options.stall}`,
    `--duel-break-seconds=${options.break}`,
    `--duel-finish-seconds=${options.finish}`,
    '--test=1',
    '--single-room=1',
    '--auto-ready=1',
  ];
  if (options.map !== 'all') serverArgs.push(`--map=${options.map}`);

  const server = spawn(process.execPath, serverArgs, {
    stdio: 'inherit',
    env: { ...process.env, PORT: String(options.port) },
  });
  server.on('error', (error) => {
    console.error(`Không chạy được server: ${error.message}`);
    process.exit(1);
  });
  server.on('exit', (code) => process.exit(code ?? 0));
  process.on('exit', () => {
    if (server.exitCode === null) server.kill(); // đừng bỏ lại server khi script bị dừng
  });
  const shutdown = () => server.kill();
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  const url = `http://localhost:${options.port}/?autoplay=1`;
  const ready = await waitForServer(options.port);
  if (!ready) {
    console.error(`Không thấy server ở cổng ${options.port}. Có thể cổng đang bận.`);
    return;
  }

  console.log(`\nMở game: ${url}`);
  console.log('Client tự vào phòng, tự sẵn sàng; các trận và sự kiện lặp liên tục. Ctrl+C để dừng.\n');
  if (options.open) {
    for (let i = 0; i < options.tabs; i++) {
      setTimeout(() => openUrl(url), i * 400);
    }
  }
}

main().catch((error) => fail(error.message));
