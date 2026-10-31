function send(ws, msg) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

// Gửi cho mọi người trong một phòng (không bao giờ sang phòng khác), kể cả khán giả (chỉ nghe, xem connection.js).
function broadcast(room, msg) {
  const data = JSON.stringify(msg);
  for (const p of room.players.values()) {
    if (p.ws.readyState === p.ws.OPEN) p.ws.send(data);
  }
  for (const o of room.observers.values()) {
    if (o.ws.readyState === o.ws.OPEN) o.ws.send(data);
  }
}

module.exports = { send, broadcast };
