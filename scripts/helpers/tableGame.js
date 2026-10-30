const { Room } = require('../../server/game/Room');
const { createPlayer } = require('../../server/game/players');
const { getMap } = require('../../server/maps');
const { handleTable } = require('../../server/game/tableGames');

function setup() {
  const room = new Room('100', ['default'], getMap('default'));
  const id = room.mapData.props.findIndex((prop) => prop.type === 'table');
  const table = room.mapData.props[id];
  const players = [-2, 2, 1.5].map((dx) => {
    const messages = [];
    const p = createPlayer({ OPEN: 1, readyState: 1, send: (data) => messages.push(JSON.parse(data)) });
    Object.assign(p, { x: table.x + dx, z: table.z, y: room.terrain.heightAt(table.x + dx, table.z), room, joined: true, messages });
    room.players.set(p.id, p);
    return p;
  });
  const join = (p) => handleTable(room, p, { action: 'join', id });
  const move = (p, cell) => handleTable(room, p, { action: 'move', cell });
  return { room, id, players, join, move };
}

module.exports = { setup };
