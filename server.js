import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { createMatch, stepMatch } from './src/simulation.js';
import { MAPS } from './src/maps.js';

export function createGameServer({
  port = Number(process.env.PORT) || 3001,
  host = '0.0.0.0',
} = {}) {
  const root = fileURLToPath(new URL('./dist/', import.meta.url)),
    rooms = new Map();
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
  };
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', rooms: rooms.size }));
        return;
      }
      const requested = decodeURIComponent(url.pathname),
        file = path.resolve(root, '.' + (requested === '/' ? '/index.html' : requested));
      if (!file.startsWith(root)) {
        res.writeHead(403);
        res.end();
        return;
      }
      const data = await readFile(file);
      res.writeHead(200, {
        'Content-Type': types[path.extname(file)] || 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(data);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found. Run npm run build before npm start.');
    }
  });
  const wss = new WebSocketServer({ server, path: '/socket', maxPayload: 2048 });
  const send = (ws, msg) => {
    if (ws.readyState === WebSocket.OPEN && ws.bufferedAmount < 262144)
      ws.send(JSON.stringify(msg));
  };
  function leave(ws) {
    const room = rooms.get(ws.room);
    if (!room) return;
    const remaining = room.clients.filter((c) => c !== ws);
    for (const other of remaining) {
      other.room = null;
      send(other, {
        type: 'left',
        message: 'Your opponent disconnected. Create a new room to play again.',
      });
    }
    rooms.delete(ws.room);
    ws.room = null;
  }
  wss.on('connection', (ws) => {
    ws.alive = true;
    ws.on('pong', () => (ws.alive = true));
    ws.input = {};
    ws.rate = 0;
    ws.rateAt = Date.now();
    ws.on('message', (raw) => {
      if (Date.now() - ws.rateAt > 1000) {
        ws.rateAt = Date.now();
        ws.rate = 0;
      }
      if (++ws.rate > 160) {
        ws.close(1008, 'Too many messages');
        return;
      }
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'create') {
        if (ws.room) return;
        if (rooms.size >= 200) {
          send(ws, { type: 'error', message: 'Server is full. Try again later.' });
          return;
        }
        const code = randomBytes(4).toString('hex').slice(0, 6).toUpperCase(),
          mapId = MAPS.some((m) => m.id === msg.mapId) ? msg.mapId : 'airframe';
        const room = {
          code,
          clients: [ws],
          mapId,
          rotate: !!msg.rotate,
          match: null,
          created: Date.now(),
          rematch: new Set(),
        };
        rooms.set(code, room);
        ws.room = code;
        ws.slot = 0;
        send(ws, { type: 'room', code, mapId, slot: 0 });
      }
      if (msg.type === 'join') {
        if (ws.room) return;
        const room = rooms.get(
          String(msg.code || '')
            .trim()
            .toUpperCase(),
        );
        if (!room) {
          send(ws, {
            type: 'error',
            message: 'Room not found. Check the code and server address.',
          });
          return;
        }
        if (room.clients.length === 2) {
          send(ws, { type: 'error', message: 'That room already has two players.' });
          return;
        }
        room.clients.push(ws);
        ws.room = room.code;
        ws.slot = 1;
        room.match = createMatch(room.mapId, room.rotate);
        room.clients.forEach((c, i) =>
          send(c, { type: 'start', slot: i, code: room.code, match: room.match }),
        );
      }
      if (msg.type === 'input' && ws.room) {
        const i = msg.input;
        if (!i || typeof i !== 'object') return;
        const number = (v, max) => (Number.isFinite(v) ? Math.max(-max, Math.min(max, v)) : 0);
        if (i.fire && !ws.input.fire) ws.fireQueued = true;
        ws.input = {
          yaw: number(i.yaw, 1e6),
          pitch: number(i.pitch, 1.45),
          forward: number(i.forward, 1),
          side: number(i.side, 1),
          jump: !!i.jump,
          sprint: !!i.sprint,
          reload: !!i.reload,
          fire: !!i.fire,
        };
      }
      if (msg.type === 'leave') leave(ws);
      if (msg.type === 'rematch') {
        const room = rooms.get(ws.room);
        if (room?.match?.phase === 'finished') {
          room.rematch.add(ws.slot);
          room.clients.forEach((c) => send(c, { type: 'rematch', count: room.rematch.size }));
          if (room.rematch.size === 2) {
            room.rematch.clear();
            room.match = createMatch(room.mapId, room.rotate);
            room.clients.forEach((c, i) => {
              c.input = {};
              send(c, { type: 'start', slot: i, code: room.code, match: room.match });
            });
          }
        }
      }
      if (msg.type === 'ping') send(ws, { type: 'pong', at: msg.at });
    });
    ws.on('close', () => leave(ws));
    ws.on('error', () => leave(ws));
  });
  let tick = 0;
  const timer = setInterval(() => {
    for (const room of rooms.values()) {
      if (!room.match) {
        if (Date.now() - room.created > 30 * 60 * 1000) {
          room.clients.forEach((c) => {
            send(c, { type: 'left', message: 'Room expired. Create another to continue.' });
            c.room = null;
          });
          rooms.delete(room.code);
        }
        continue;
      }
      stepMatch(
        room.match,
        room.clients.map((c) => ({ ...c.input, fire: c.input.fire || c.fireQueued })),
        1 / 60,
      );
      room.clients.forEach((c) => (c.fireQueued = false));
      if (tick % 3 === 0)
        room.clients.forEach((c) => send(c, { type: 'state', match: room.match }));
    }
    tick++;
  }, 1000 / 60);
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.alive) {
        ws.terminate();
        continue;
      }
      ws.alive = false;
      ws.ping();
    }
  }, 30000);
  server.listen(port, host);
  return {
    server,
    rooms,
    wss,
    close: () =>
      new Promise((resolve) => {
        clearInterval(timer);
        clearInterval(heartbeat);
        wss.clients.forEach((ws) => ws.terminate());
        wss.close(() => server.close(resolve));
      }),
  };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const app = createGameServer();
  app.server.on('listening', () =>
    console.log(`Rail Duel Club: http://localhost:${app.server.address().port}`),
  );
}
