import { getMap, MAPS } from './maps.js';
export const RULES = {
  speed: 10,
  sprint: 14,
  jump: 8.6,
  gravity: 25,
  radius: 0.38,
  height: 1.7,
  reload: 1.35,
  cooldown: 0.48,
  roundTime: 30,
  target: 7,
};
export function direction(yaw, pitch = 0) {
  return {
    x: -Math.sin(yaw) * Math.cos(pitch),
    y: Math.sin(pitch),
    z: -Math.cos(yaw) * Math.cos(pitch),
  };
}
export function rayBox(o, d, min, max) {
  let near = 0,
    far = Infinity;
  for (const a of ['x', 'y', 'z']) {
    if (Math.abs(d[a]) < 1e-8) {
      if (o[a] < min[a] || o[a] > max[a]) return Infinity;
    } else {
      let t1 = (min[a] - o[a]) / d[a],
        t2 = (max[a] - o[a]) / d[a];
      if (t1 > t2) [t1, t2] = [t2, t1];
      near = Math.max(near, t1);
      far = Math.min(far, t2);
      if (near > far) return Infinity;
    }
  }
  return near;
}
export function bounds(b) {
  return [
    { x: b.x - b.w / 2, y: b.y, z: b.z - b.d / 2 },
    { x: b.x + b.w / 2, y: b.y + b.h, z: b.z + b.d / 2 },
  ];
}
export function wallDistance(map, o, d) {
  return Math.min(...map.blocks.map((b) => rayBox(o, d, ...bounds(b))), 100);
}
export function makePlayer(id) {
  return {
    id,
    x: 0,
    y: 0,
    z: 0,
    vy: 0,
    yaw: 0,
    pitch: 0,
    alive: true,
    ground: true,
    ammo: 2,
    reload: 0,
    cooldown: 0,
    score: 0,
    kills: 0,
    shots: 0,
  };
}
export function movePlayer(p, input, map, dt) {
  p.yaw = Number.isFinite(input.yaw) ? input.yaw : p.yaw;
  p.pitch = Math.max(-1.45, Math.min(1.45, Number.isFinite(input.pitch) ? input.pitch : p.pitch));
  let forward = Math.max(-1, Math.min(1, input.forward || 0)),
    side = Math.max(-1, Math.min(1, input.side || 0));
  const n = Math.max(1, Math.hypot(forward, side)),
    speed = input.sprint ? RULES.sprint : RULES.speed;
  const dx = ((-Math.sin(p.yaw) * forward + Math.cos(p.yaw) * side) / n) * speed * dt,
    dz = ((-Math.cos(p.yaw) * forward - Math.sin(p.yaw) * side) / n) * speed * dt;
  const blocked = (x, z) =>
    map.blocks.some(
      (b) =>
        p.y < b.y + b.h - 0.04 &&
        p.y + RULES.height > b.y + 0.04 &&
        x + RULES.radius > b.x - b.w / 2 &&
        x - RULES.radius < b.x + b.w / 2 &&
        z + RULES.radius > b.z - b.d / 2 &&
        z - RULES.radius < b.z + b.d / 2,
    );
  const limit = map.size - RULES.radius;
  if (!blocked(p.x + dx, p.z)) p.x = Math.max(-limit, Math.min(limit, p.x + dx));
  if (!blocked(p.x, p.z + dz)) p.z = Math.max(-limit, Math.min(limit, p.z + dz));
  if (input.jump && p.ground) {
    p.vy = RULES.jump;
    p.ground = false;
  }
  const oldY = p.y;
  p.vy -= RULES.gravity * dt;
  p.y += p.vy * dt;
  p.ground = false;
  let floor = 0;
  for (const b of map.blocks) {
    if (
      p.x + RULES.radius > b.x - b.w / 2 &&
      p.x - RULES.radius < b.x + b.w / 2 &&
      p.z + RULES.radius > b.z - b.d / 2 &&
      p.z - RULES.radius < b.z + b.d / 2
    ) {
      const top = b.y + b.h;
      if (oldY >= top - 0.06 && p.y <= top && p.vy <= 0) floor = Math.max(floor, top);
      if (oldY + RULES.height <= b.y && p.y + RULES.height >= b.y && p.vy > 0) {
        p.y = b.y - RULES.height;
        p.vy = 0;
      }
    }
  }
  if (p.y <= floor) {
    p.y = floor;
    p.vy = 0;
    p.ground = true;
  }
}
export function createMatch(mapId = 'airframe', rotate = false) {
  const m = {
    mapId: getMap(mapId).id,
    rotate,
    players: [makePlayer(0), makePlayer(1)],
    phase: 'countdown',
    timer: 1.5,
    round: 1,
    events: [],
    eventId: 0,
    winner: null,
  };
  spawn(m);
  return m;
}
function emit(m, type, data = {}) {
  m.events.push({ id: ++m.eventId, type, ...data });
  if (m.events.length > 24) m.events.shift();
}
function spawn(m) {
  const map = getMap(m.mapId);
  m.players.forEach((p, i) => {
    const s = map.spawn[(i + (m.round % 2 === 0 ? 1 : 0)) % 2];
    Object.assign(p, {
      x: s[0],
      y: s[1],
      z: s[2],
      vy: 0,
      alive: true,
      ammo: 2,
      reload: 0,
      cooldown: 0,
      ground: true,
      pitch: 0,
      yaw: Math.atan2(s[0], s[2]),
    });
  });
}
export function endRound(m, winner) {
  if (m.phase !== 'live') return;
  m.winner = winner;
  if (winner !== null) {
    m.players[winner].score++;
    m.players[winner].kills++;
  }
  m.phase = m.players.some((p) => p.score >= RULES.target) ? 'finished' : 'intermission';
  m.timer = m.phase === 'finished' ? 0 : 1.6;
  emit(m, 'round', { winner });
}
export function shoot(m, id) {
  const p = m.players[id];
  if (m.phase !== 'live' || !p.alive || p.reload > 0 || p.cooldown > 0) return false;
  if (!p.ammo) {
    p.reload = RULES.reload;
    emit(m, 'reload', { player: id });
    return false;
  }
  p.ammo--;
  p.shots++;
  p.cooldown = RULES.cooldown;
  const origin = { x: p.x, y: p.y + 1.48, z: p.z },
    d = direction(p.yaw, p.pitch),
    wall = wallDistance(getMap(m.mapId), origin, d),
    other = m.players[1 - id];
  const hit = other.alive
    ? rayBox(
        origin,
        d,
        { x: other.x - 0.43, y: other.y, z: other.z - 0.43 },
        { x: other.x + 0.43, y: other.y + 1.85, z: other.z + 0.43 },
      )
    : Infinity;
  const distance = Math.min(hit, wall, 100);
  emit(m, 'shot', {
    player: id,
    origin,
    end: {
      x: origin.x + d.x * distance,
      y: origin.y + d.y * distance,
      z: origin.z + d.z * distance,
    },
    hit: hit < wall,
  });
  if (hit < wall) {
    other.alive = false;
    endRound(m, id);
  }
  return true;
}
export function stepMatch(m, inputs, dt) {
  dt = Math.min(dt, 1 / 30);
  if (m.phase === 'finished') return;
  m.timer -= dt;
  if (m.phase === 'countdown' && m.timer <= 0) {
    m.phase = 'live';
    m.timer = RULES.roundTime;
    emit(m, 'live');
  }
  if (m.phase === 'intermission' && m.timer <= 0) {
    m.round++;
    if (m.rotate) {
      m.mapId = MAPS[(MAPS.findIndex((a) => a.id === m.mapId) + 1) % MAPS.length].id;
    }
    spawn(m);
    m.phase = 'countdown';
    m.timer = 1;
    emit(m, 'spawn');
  }
  if (m.phase !== 'live') return;
  m.players.forEach((p, i) => {
    if (!p.alive) return;
    const input = inputs[i] || {};
    p.cooldown = Math.max(0, p.cooldown - dt);
    if (p.reload > 0) {
      p.reload = Math.max(0, p.reload - dt);
      if (p.reload === 0) p.ammo = 2;
    }
    if (input.reload && p.ammo < 2 && !p.reload) {
      p.reload = RULES.reload;
      emit(m, 'reload', { player: i });
    }
    movePlayer(p, input, getMap(m.mapId), dt);
  });
  // Alternate evaluation order so neither slot always has shot priority.
  const order = m.round % 2 ? [0, 1] : [1, 0];
  for (const i of order) if (inputs[i]?.fire) shoot(m, i);
  if (m.timer <= 0 && m.phase === 'live') endRound(m, null);
}
// Grid search gives the bot routes around actual map cover.
export function findPath(map, start, end) {
  const cell = 2,
    size = Math.ceil((map.size * 2) / cell),
    toGrid = (v) => Math.max(0, Math.min(size - 1, Math.floor((v + map.size) / cell))),
    world = (v) => v * cell - map.size + cell / 2;
  const sx = toGrid(start.x),
    sz = toGrid(start.z),
    ex = toGrid(end.x),
    ez = toGrid(end.z),
    key = (x, z) => x + z * size,
    source = key(sx, sz),
    target = key(ex, ez),
    queue = [[sx, sz]],
    visited = new Map([[source, null]]);
  for (let i = 0; i < queue.length; i++) {
    const [x, z] = queue[i],
      k = key(x, z);
    if (k === target) break;
    for (const [a, b] of [
      [x + 1, z],
      [x - 1, z],
      [x, z + 1],
      [x, z - 1],
    ]) {
      const nk = key(a, b);
      if (a < 0 || b < 0 || a >= size || b >= size || visited.has(nk)) continue;
      const wx = world(a),
        wz = world(b);
      if (
        map.blocks.some(
          (o) => Math.abs(wx - o.x) < o.w / 2 + 0.6 && Math.abs(wz - o.z) < o.d / 2 + 0.6,
        )
      )
        continue;
      visited.set(nk, k);
      queue.push([a, b]);
    }
  }
  if (!visited.has(target)) return [];
  const path = [];
  for (let k = target; k !== source; k = visited.get(k))
    path.push({ x: world(k % size), z: world(Math.floor(k / size)) });
  return path.reverse();
}
export function createBot() {
  return { time: 0, visible: 0, path: [], nextPath: 0, error: 0, nextError: 0 };
}
export function botInput(m, bot, dt, difficulty = 'normal') {
  const p = m.players[1],
    target = m.players[0],
    map = getMap(m.mapId);
  bot.time += dt;
  const dx = target.x - p.x,
    dz = target.z - p.z,
    dist = Math.hypot(dx, dz),
    yaw = Math.atan2(-dx, -dz),
    pitch = Math.atan2(target.y + 0.95 - (p.y + 1.48), dist);
  const d = direction(yaw, pitch),
    visible = wallDistance(map, { x: p.x, y: p.y + 1.48, z: p.z }, d) > dist - 0.5;
  if (m.phase !== 'live' || !target.alive) {
    bot.visible = 0;
    return {};
  }
  bot.visible = visible ? bot.visible + dt : 0;
  const skill =
    difficulty === 'easy'
      ? { reaction: 1.05, error: 0.13 }
      : difficulty === 'hard'
        ? { reaction: 0.38, error: 0.026 }
        : { reaction: 0.7, error: 0.065 };
  if (bot.time > bot.nextError) {
    bot.error = (Math.random() - 0.5) * skill.error * 2;
    bot.nextError = bot.time + 0.35;
  }
  let moveYaw = yaw,
    forward = 0,
    side = 0;
  if (!visible || dist > 23) {
    if (bot.time > bot.nextPath) {
      bot.path = findPath(map, p, target);
      bot.nextPath = bot.time + 0.6;
    }
    while (bot.path.length && Math.hypot(bot.path[0].x - p.x, bot.path[0].z - p.z) < 1.2)
      bot.path.shift();
    const next = bot.path[0];
    if (next) {
      moveYaw = Math.atan2(-(next.x - p.x), -(next.z - p.z));
      forward = 0.85;
    }
  } else {
    side = Math.sin(bot.time * 1.7) > 0 ? 0.8 : -0.8;
    forward = dist < 7 ? -0.6 : dist > 15 ? 0.35 : 0;
  }
  return {
    yaw: visible ? yaw + bot.error : moveYaw,
    pitch: visible ? pitch + bot.error * 0.3 : 0,
    forward,
    side,
    fire: visible && bot.visible > skill.reaction,
    reload: p.ammo === 0,
    jump: visible && Math.sin(bot.time * 2.1) > 0.995,
  };
}
