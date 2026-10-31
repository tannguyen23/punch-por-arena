const http = require('http');
const fs = require('fs');
const path = require('path');
const { PUBLIC_DIR, VENDOR_FILES } = require('../config');
const { mapOptions } = require('../maps');
const { listRooms } = require('../game/rooms');
const { weaponDropInfo } = require('../game/weapons');
const { eventChoices } = require('../game/events');
const { handleDebug } = require('./debugRoutes');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.mp3': 'audio/mpeg',
};

// Chỉ phục vụ file nằm trong public/, cộng thêm thư viện Babylon từ node_modules (VENDOR_FILES).
function resolveFile(pathname) {
  if (pathname.includes('\0')) return null; // createReadStream ném lỗi với byte null và làm sập cả server
  if (pathname === '/') pathname = '/index.html';
  if (pathname === '/char-anim') pathname = '/char-anim.html'; // trang debug hoạt ảnh
  if (VENDOR_FILES[pathname]) return VENDOR_FILES[pathname];
  const file = path.join(PUBLIC_DIR, pathname);
  return file.startsWith(PUBLIC_DIR + path.sep) ? file : null;
}

function createStaticServer() {
  return http.createServer((req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400).end('Bad request'); // vd: `GET //` làm new URL ném lỗi, không được để lọt ra ngoài làm sập server
      return;
    }
    if (handleDebug(req, res, pathname)) return; // /admin-test và /api/debug/*: chỉ khi bật dev:debug
    if (pathname === '/api/maps') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(mapOptions));
      return;
    }
    if (pathname === '/api/rooms') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }).end(JSON.stringify(listRooms()));
      return;
    }
    if (pathname === '/api/weapons') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(weaponDropInfo()));
      return;
    }
    if (pathname === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(eventChoices()));
      return;
    }
    if (pathname === '/favicon.ico') {
      res.writeHead(204).end();
      return;
    }

    const file = resolveFile(pathname);
    const type = file && MIME[path.extname(file)];
    if (!type) {
      res.writeHead(404).end('Not found');
      return;
    }

    const stream = fs.createReadStream(file);
    stream.on('error', () => res.headersSent || res.writeHead(404).end('Not found'));
    stream.on('open', () => {
      res.writeHead(200, { 'Content-Type': type });
      stream.pipe(res);
    });
  });
}

module.exports = { createStaticServer };
