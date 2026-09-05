import { getMap, MAPS } from './maps.js';
import { localPoint, overlaps, extents, sharesVisibility } from './geometry.js';
export const RULES = {
  speed: 10,
  sprint: 14,
  jump: 8.6,
  gravity: 25,
  radius: 0.38,
  height: 1.7,
  stepHeight: 0.32,
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
export function raySolid(b, o, d) {
  const p = localPoint(b, o),
    c = Math.cos(b.yaw || 0),
    s = Math.sin(b.yaw || 0);
  return rayBox(
    p,
    { x: c * d.x - s * d.z, y: d.y, z: s * d.x + c * d.z },
    { x: -b.w / 2, y: b.y, z: -b.d / 2 },
    { x: b.w / 2, y: b.y + b.h, z: b.d / 2 },
  );
}
export function wallDistance(map, o, d) {
  return Math.min(...map.blocks.map((b) => raySolid(b, o, d)), 100);
}
export function positionClear(map, x, y, z, radius = RULES.radius) {
  return !map.blocks.some(
    (b) => overlaps(b, x, z, radius) && y < b.y + b.h - 0.015 && y + RULES.height > b.y + 0.015,
  );
}
export function surfacesAt(map, x, z, radius = RULES.radius) {
  const levels = [0, ...map.blocks.filter((b) => overlaps(b, x, z, radius)).map((b) => b.y + b.h)];
  return [...new Set(levels)]
    .filter((y) => positionClear(map, x, y, z, radius))
    .sort((a, b) => a - b);
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
  const [ex, ez] = extents(map),
    parts = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.16));
  const jump = input.jump && p.ground;
  if (jump) {
    p.vy = RULES.jump;
    p.ground = false;
  }
  const slide = (x, z) => {
    x = Math.max(-ex + RULES.radius, Math.min(ex - RULES.radius, x));
    z = Math.max(-ez + RULES.radius, Math.min(ez - RULES.radius, z));
    if (positionClear(map, x, p.y, z)) {
      p.x = x;
      p.z = z;
      return;
    }
    if (p.ground && !jump) {
      const candidates = surfacesAt(map, x, z).filter(
        (y) => y > p.y && y <= p.y + RULES.stepHeight + 0.001,
      );
      if (candidates.length) {
        p.y = candidates[0];
        p.x = x;
        p.z = z;
        p.vy = 0;
      }
    }
  };
  for (let i = 0; i < parts; i++) {
    slide(p.x + dx / parts, p.z);
    slide(p.x, p.z + dz / parts);
  }
  const oldY = p.y;
  p.vy -= RULES.gravity * dt;
  p.y += p.vy * dt;
  let floor = 0;
  for (const b of map.blocks) {
    if (!overlaps(b, p.x, p.z)) continue;
    const top = b.y + b.h;
    if (oldY >= top - 0.02 && p.y <= top && p.vy <= 0) floor = Math.max(floor, top);
    if (oldY + RULES.height <= b.y + 0.01 && p.y + RULES.height >= b.y && p.vy > 0) {
      p.y = b.y - RULES.height;
      p.vy = 0;
    }
  }
  // Follow descending stair treads without bouncing, but allow genuine drops.
  if (p.ground && !jump) {
    const below = surfacesAt(map, p.x, p.z).filter(
      (y) => y <= oldY + 0.01 && y >= oldY - RULES.stepHeight - 0.01,
    );
    if (below.length) floor = Math.max(floor, ...below);
  }
  p.ground = false;
  if (p.y <= floor + 0.001) {
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
// Cache a multi-level surface graph; bridges retain both upper and lower nodes.
const navigation = new WeakMap();
function navGraph(map) {
  if (navigation.has(map)) return navigation.get(map);
  const [ex, ez] = extents(map),
    cell = 1,
    cols = Math.ceil(ex * 2),
    rows = Math.ceil(ez * 2),
    nodes = [],
    columns = new Map();
  for (let iz = 0; iz < rows; iz++)
    for (let ix = 0; ix < cols; ix++) {
      const x = -ex + (ix + 0.5) * cell,
        z = -ez + (iz + 0.5) * cell;
      const stack = surfacesAt(map, x, z, 0.42).map((y) => {
        const node = { x, y, z, ix, iz, id: nodes.length, edges: [] };
        nodes.push(node);
        return node;
      });
      columns.set(ix + iz * cols, stack);
    }
  for (const node of nodes)
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const ix = node.ix + dx,
        iz = node.iz + dz;
      if (ix < 0 || iz < 0 || ix >= cols || iz >= rows) continue;
      for (const other of columns.get(ix + iz * cols) || []) {
        const rise = other.y - node.y;
        if (rise > 1.25 || rise < -7) continue;
        if (
          positionClear(
            map,
            (node.x + other.x) / 2,
            Math.max(node.y, other.y),
            (node.z + other.z) / 2,
            0.39,
          )
        )
          node.edges.push(other.id);
      }
    }
  const graph = { nodes };
  navigation.set(map, graph);
  return graph;
}
export function findPath(map, start, end) {
  const { nodes } = navGraph(map);
  if (!nodes.length) return [];
  const nearest = (p) =>
    nodes.reduce(
      (best, n) => {
        const dist = (n.x - p.x) ** 2 + (n.z - p.z) ** 2 + ((n.y - (p.y || 0)) * 3) ** 2;
        return dist < best.dist ? { id: n.id, dist } : best;
      },
      { id: 0, dist: Infinity },
    ).id;
  const source = nearest(start),
    target = nearest(end),
    queue = [source],
    visited = new Map([[source, null]]);
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    if (id === target) break;
    for (const next of nodes[id].edges) {
      if (visited.has(next)) continue;
      visited.set(next, id);
      queue.push(next);
    }
  }
  if (!visited.has(target)) return [];
  const path = [];
  for (let k = target; k !== source; k = visited.get(k)) {
    const { x, y, z } = nodes[k];
    path.push({ x, y, z });
  }
  return path.reverse();
}
export function createBot() {
  return { time: 0, visible: 0, path: [], nextPath: 0, error: 0, nextError: 0, round: 0 };
}
export function botInput(m, bot, dt, difficulty = 'normal') {
  const p = m.players[1],
    target = m.players[0],
    map = getMap(m.mapId);
  bot.time += dt;
  if (bot.round !== m.round) {
    bot.path = [];
    bot.nextPath = 0;
    bot.visible = 0;
    bot.round = m.round;
  }
  const dx = target.x - p.x,
    dz = target.z - p.z,
    dist = Math.hypot(dx, dz),
    yaw = Math.atan2(-dx, -dz),
    pitch = Math.atan2(target.y + 0.95 - (p.y + 1.48), dist);
  const d = direction(yaw, pitch),
    visible =
      sharesVisibility(map, p, target) &&
      wallDistance(map, { x: p.x, y: p.y + 1.48, z: p.z }, d) >
        Math.hypot(dist, target.y - p.y) - 0.5;
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
    while (
      bot.path.length &&
      Math.hypot(bot.path[0].x - p.x, bot.path[0].z - p.z) < 0.55 &&
      Math.abs(bot.path[0].y - p.y) < 0.5
    )
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
    yaw: !visible || dist > 23 ? moveYaw : yaw + bot.error,
    pitch: visible ? pitch + bot.error * 0.3 : 0,
    forward,
    side,
    fire: visible && bot.visible > skill.reaction,
    reload: p.ammo === 0,
    jump:
      (bot.path[0]?.y > p.y + 0.35 && p.ground) || (visible && Math.sin(bot.time * 2.1) > 0.995),
  };
}
