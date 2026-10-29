const http = require('http');
const fs = require('fs');
const path = require('path');
const { PUBLIC_DIR, VENDOR_FILES } = require('../config');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.glb': 'model/gltf-binary',
};

// Chỉ phục vụ file nằm trong public/, cộng thêm thư viện Babylon từ node_modules (VENDOR_FILES).
function resolveFile(pathname) {
  if (pathname === '/') pathname = '/index.html';
  if (pathname === '/char-anim') pathname = '/char-anim.html'; // trang debug hoạt ảnh
  if (VENDOR_FILES[pathname]) return VENDOR_FILES[pathname];
  const file = path.join(PUBLIC_DIR, pathname);
  return file.startsWith(PUBLIC_DIR + path.sep) ? file : null;
}

function createStaticServer() {
  return http.createServer((req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (pathname === '/favicon.ico') {
      res.writeHead(204).end();
      return;
    }

    let file;
    try {
      file = resolveFile(decodeURIComponent(pathname));
    } catch {
      res.writeHead(400).end('Bad request');
      return;
    }

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
