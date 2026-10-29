const fs = require('fs');
const path = require('path');
const { DEBUG } = require('../config');
const { describe, apply } = require('../debug/options');

// Trang /admin-test và /api/debug/* của công cụ debug. Chỉ có khi chạy `npm run dev:debug` (DEBUG); tắt thì mọi đường dẫn ở đây là 404 như chưa từng có,
// và dù bật vẫn chỉ nhận yêu cầu từ chính máy chạy server (trang này đổi được luật chơi của cả server).
// File giao diện nằm ngoài public/ (server/debug/web) nên không bao giờ bị phục vụ qua static server khi tắt debug.

const WEB_DIR = path.join(__dirname, '..', 'debug', 'web');
const PAGE_FILE = /^\/admin-test\/([\w-]+\.(?:js|css))$/;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const MAX_BODY_BYTES = 4096;

const sendJson = (res, status, body) => res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(body));

function sendFile(res, name) {
  fs.readFile(path.join(WEB_DIR, name), (error, data) => {
    if (error) res.writeHead(404).end('Not found');
    else res.writeHead(200, { 'Content-Type': MIME[path.extname(name)], 'Cache-Control': 'no-store' }).end(data);
  });
}

function readJson(req, callback) {
  const chunks = [];
  let size = 0;
  req.on('data', (chunk) => {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) req.destroy();
    else chunks.push(chunk);
  });
  req.on('end', () => {
    try {
      callback(null, JSON.parse(Buffer.concat(chunks).toString('utf8')));
    } catch {
      callback(new Error('Dữ liệu không phải JSON'));
    }
  });
}

// Trả về true nếu đã xử lý yêu cầu này (để staticServer.js không xử lý nữa).
function handleDebug(req, res, pathname) {
  const pageFile = PAGE_FILE.exec(pathname)?.[1];
  const isPage = pathname === '/admin-test' || pathname === '/admin-test/' || pageFile;
  if (!DEBUG || !(isPage || pathname.startsWith('/api/debug/'))) return false;
  if (!LOOPBACK.has(req.socket.remoteAddress)) {
    res.writeHead(403).end('Forbidden');
    return true;
  }

  if (isPage && req.method === 'GET') {
    sendFile(res, pageFile ?? 'adminTest.html');
  } else if (pathname === '/api/debug/options' && req.method === 'GET') {
    sendJson(res, 200, describe());
  } else if (pathname === '/api/debug/apply' && req.method === 'POST') {
    readJson(req, (error, body) => {
      if (error) return sendJson(res, 400, { error: error.message });
      try {
        sendJson(res, 200, { ok: true, applied: apply(body) });
      } catch (applyError) {
        sendJson(res, 400, { error: applyError.message });
      }
    });
  } else {
    res.writeHead(404).end('Not found');
  }
  return true;
}

module.exports = { handleDebug };
