import test from 'node:test';
import assert from 'node:assert/strict';
import { block, slab, stairs, sharesVisibility } from '../src/geometry.js';
import { getMap } from '../src/maps.js';
import {
  makePlayer,
  movePlayer,
  raySolid,
  surfacesAt,
  findPath,
  createMatch,
  createBot,
  botInput,
} from '../src/simulation.js';

test('stairs ascend and descend without jumping, at walk and sprint speed', () => {
  const map = { size: 12, blocks: [...stairs(0, 0, 4, 8, 0, 4, 'z', -1), slab(0, -6, 4, 4, 4)] };
  for (const sprint of [false, true]) {
    const p = makePlayer(0);
    p.z = 6;
    for (let i = 0; i < 60; i++) movePlayer(p, { forward: 1, yaw: 0, sprint }, map, 1 / 60);
    assert.ok(p.y >= 3.9, JSON.stringify(p));
    for (let i = 0; i < 90; i++) movePlayer(p, { forward: 1, yaw: Math.PI, sprint }, map, 1 / 60);
    assert.ok(p.y < 0.01);
    assert.ok(p.ground);
  }
});
test('a bridge supports a player above and leaves a walkable passage below', () => {
  const map = { size: 10, blocks: [slab(0, 0, 6, 4, 3)] };
  assert.deepEqual(surfacesAt(map, 0, 0), [0, 3]);
  const low = makePlayer(0);
  low.z = 5;
  for (let i = 0; i < 60; i++) movePlayer(low, { forward: 1 }, map, 1 / 60);
  assert.ok(low.z < -4);
  assert.equal(low.y, 0);
  const high = makePlayer(0);
  Object.assign(high, { y: 5, ground: false });
  for (let i = 0; i < 90; i++) movePlayer(high, {}, map, 1 / 60);
  assert.equal(high.y, 3);
  const jumping = makePlayer(0);
  movePlayer(jumping, { jump: true }, map, 1 / 60);
  let max = 0;
  for (let i = 0; i < 80; i++) {
    movePlayer(jumping, {}, map, 1 / 60);
    max = Math.max(max, jumping.y);
  }
  assert.ok(max <= 1.01, 'Head must not pass through the underside');
});
test('rotated cover has matching hitscan and movement collision', () => {
  const wall = block(0, 0, 0.5, 10, 3, 'wall', 0, Math.PI / 4),
    map = { size: 12, blocks: [wall] };
  assert.ok(raySolid(wall, { x: 6, y: 1, z: 0 }, { x: -1, y: 0, z: 0 }) < 6);
  const p = makePlayer(0);
  p.x = 6;
  for (let i = 0; i < 35; i++) movePlayer(p, { forward: 1, yaw: Math.PI / 2 }, map, 1 / 60);
  assert.ok(p.x > 0.3);
  assert.equal(raySolid(wall, { x: 6, y: 4, z: 0 }, { x: -1, y: 0, z: 0 }), Infinity);
});
test('pit visibility is bilateral and prevents AI firing across the mouth', () => {
  const map = getMap('riverpit'),
    inside = { x: 11, y: 0, z: -5 },
    outside = { x: 11, y: 0, z: 5 };
  assert.equal(sharesVisibility(map, inside, outside), false);
  assert.equal(sharesVisibility(map, outside, inside), false);
  assert.equal(sharesVisibility(map, inside, { x: 12, y: 0, z: -10 }), true);
  const m = createMatch('riverpit');
  m.phase = 'live';
  Object.assign(m.players[0], outside);
  Object.assign(m.players[1], inside);
  const bot = createBot();
  for (let i = 0; i < 120; i++) assert.equal(botInput(m, bot, 1 / 60, 'hard').fire, false);
});
test('navigation can reach upper Metro hall and both sides of a bridge', () => {
  const metro = getMap('platform');
  const path = findPath(metro, { x: -10, y: 0, z: 28 }, { x: 9, y: 4, z: -25 });
  assert.ok(path.some((p) => p.y > 3.9));
  assert.ok(path.some((p) => p.y > 0 && p.y < 4));
  const map = { size: 12, blocks: [slab(0, 0, 6, 6, 3), ...stairs(0, 7, 3, 8, 0, 3, 'z', -1)] };
  assert.ok(findPath(map, { x: 0, y: 0, z: 11 }, { x: 0, y: 3, z: 0 }).length);
  assert.ok(findPath(map, { x: -8, y: 0, z: 0 }, { x: 8, y: 0, z: 0 }).every((p) => p.y === 0));
});
