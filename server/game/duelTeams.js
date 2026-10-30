// Chọn ngẫu nhiên hai đội bằng nhau; võ sĩ đang chờ hồi sinh cũng được dựng dậy khi vào võ đài.
function pickTeams(room) {
  const pool = [...room.players.values()].filter((p) => !p.dog);
  if (pool.length < 2) return null;
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const size = Math.floor(pool.length / 2);
  return [pool.slice(0, size), pool.slice(size, size * 2)];
}

const fightersOf = (room, ev) => ev.fighters.map((id) => room.players.get(id));
const teamOf = (ev, id) => ev.teams.findIndex((ids) => ids.includes(id));
const livingOf = (room, ids) => ids.map((id) => room.players.get(id)).filter((p) => p && !p.dead);
const spectatorsOf = (room, ev) => [...room.players.values()].filter((p) => !ev.fighters.includes(p.id));
const allBetsPlaced = (room, ev) => spectatorsOf(room, ev).every((p) => ev.bets.has(p.id));

// Không ai đánh quá lâu: ưu tiên số người còn sống, rồi tổng máu, bằng nhau mới bốc thăm.
function leaderIndex(room, ev) {
  const teams = ev.teams.map((ids) => livingOf(room, ids));
  const count = teams.map((players) => players.length);
  if (count[0] !== count[1]) return count[0] > count[1] ? 0 : 1;
  const hp = teams.map((players) => players.reduce((sum, p) => sum + p.hp, 0));
  return hp[0] === hp[1] ? Math.floor(Math.random() * 2) : hp[0] > hp[1] ? 0 : 1;
}

module.exports = { pickTeams, fightersOf, teamOf, livingOf, spectatorsOf, allBetsPlaced, leaderIndex };
