import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { createGameServer } from '../server.js';
function receive(ws, type) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.off('message', handler);
      reject(new Error(`Timeout waiting for ${type}`));
    }, 4000);
    function handler(raw) {
      const msg = JSON.parse(raw);
      if (msg.type === type) {
        clearTimeout(timeout);
        ws.off('message', handler);
        resolve(msg);
      }
    }
    ws.on('message', handler);
  });
}
test('two clients create and join a room, share authoritative state and handle disconnect', async () => {
  const app = createGameServer({ port: 0, host: '127.0.0.1' });
  await once(app.server, 'listening');
  const port = app.server.address().port;
  const clients = [];
  try {
    const connect = async () => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/socket`);
      clients.push(ws);
      await once(ws, 'open');
      return ws;
    };
    const a = await connect(),
      b = await connect(),
      c = await connect();
    let wait = receive(a, 'room');
    a.send(JSON.stringify({ type: 'create', mapId: 'market' }));
    const room = await wait;
    assert.match(room.code, /^[A-F0-9]{6}$/);
    const starts = [receive(a, 'start'), receive(b, 'start')];
    b.send(JSON.stringify({ type: 'join', code: room.code }));
    const [first, second] = await Promise.all(starts);
    assert.equal(first.slot, 0);
    assert.equal(second.slot, 1);
    assert.equal(first.match.mapId, 'market');
    wait = receive(c, 'error');
    c.send(JSON.stringify({ type: 'join', code: room.code }));
    assert.match((await wait).message, /two players/);
    const state = await receive(a, 'state');
    assert.equal(state.match.players.length, 2);
    assert.deepEqual(
      state.match.players.map((p) => p.score),
      [0, 0],
    );
    // Send impossible client positions: server ignores them and sanitizes input.
    a.send(JSON.stringify({ type: 'input', input: { x: 99999, y: 99999, forward: 100, yaw: 0 } }));
    const next = await receive(b, 'state');
    assert.ok(next.match.players[0].x < 23);
    assert.ok(next.match.players[0].y < 5);
    let live = next;
    while (live.match.phase !== 'live') live = await receive(a, 'state');
    assert.equal(live.match.players[0].ammo, 1);
    a.send(JSON.stringify({ type: 'input', input: { fire: true, pitch: 1.4, yaw: 0 } }));
    let fired = await receive(a, 'state');
    while (fired.match.players[0].shots === 0) fired = await receive(a, 'state');
    a.send(JSON.stringify({ type: 'input', input: { fire: false, pitch: 1.4, yaw: 0 } }));
    assert.equal(fired.match.players[0].ammo, 0);
    assert.ok(fired.match.players[0].reload > 0);
    let charged = await receive(b, 'state');
    while (charged.match.players[0].ammo === 0) charged = await receive(b, 'state');
    assert.equal(charged.match.players[0].ammo, 1);
    assert.equal(charged.match.players[0].shots, 1);
    wait = receive(b, 'left');
    a.close();
    assert.match((await wait).message, /disconnected/);
    assert.equal(app.rooms.size, 0);
    const health = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(health.status, 200);
  } finally {
    clients.forEach((c) => c.terminate());
    await app.close();
  }
});
