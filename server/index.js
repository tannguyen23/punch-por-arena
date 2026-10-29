const { WebSocketServer } = require('ws');
const { PORT } = require('./config');
const { createStaticServer } = require('./http/staticServer');
const { handleConnection } = require('./net/connection');
const { startSnapshotLoop } = require('./game/snapshot');
const { startMatchLoop } = require('./game/match');
const { startProjectileLoop } = require('./game/projectiles');

const server = createStaticServer();
const wss = new WebSocketServer({ server });

wss.on('connection', handleConnection);
startSnapshotLoop();
startMatchLoop();
startProjectileLoop();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Game chạy tại http://localhost:${PORT}`);
});
