import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, getMap } from '../src/maps.js';
import {
  RULES,
  createMatch,
  stepMatch,
  shoot,
  movePlayer,
  rayBox,
  findPath,
  createBot,
  botInput,
  positionClear,
  surfacesAt,
} from '../src/simulation.js';
const empty = { size: 30, blocks: [] };
function live() {
  const m = createMatch();
  m.phase = 'live';
  m.timer = 30;
  Object.assign(m.players[0], { x: -17, z: 0, yaw: 0, pitch: 0 });
  Object.assign(m.players[1], { x: -17, z: -10 });
  return m;
}
test('every arena has unobstructed spawns and a traversable path between them', () => {
  for (const map of MAPS) {
    for (const [x, y, z] of map.spawn)
      assert.ok(
        positionClear(map, x, y, z) &&
          surfacesAt(map, x, z).some((top) => Math.abs(top - y) < 0.01),
        map.id,
      );
    assert.ok(
      findPath(
        map,
        { x: map.spawn[0][0], y: map.spawn[0][1], z: map.spawn[0][2] },
        { x: map.spawn[1][0], y: map.spawn[1][1], z: map.spawn[1][2] },
      ).length,
      map.id,
    );
  }
});
test('ray intersection handles parallel axes and cover in front of targets', () => {
  assert.equal(
    rayBox(
      { x: 0, y: 1, z: 5 },
      { x: 0, y: 0, z: -1 },
      { x: -1, y: 0, z: -1 },
      { x: 1, y: 2, z: 1 },
    ),
    4,
  );
  assert.equal(
    rayBox(
      { x: 2, y: 1, z: 5 },
      { x: 0, y: 0, z: -1 },
      { x: -1, y: 0, z: -1 },
      { x: 1, y: 2, z: 1 },
    ),
    Infinity,
  );
  const m = live();
  Object.assign(m.players[0], { x: 0, z: 15 });
  Object.assign(m.players[1], { x: 0, z: -15 });
  shoot(m, 0);
  assert.equal(m.players[1].alive, true);
  assert.equal(m.phase, 'live');
});
test('one hit awards exactly one point and respawns both players quickly', () => {
  const m = live();
  assert.equal(shoot(m, 0), true);
  assert.equal(m.players[0].score, 1);
  assert.equal(m.players[1].alive, false);
  assert.equal(shoot(m, 0), false);
  for (let i = 0; i < 100; i++) stepMatch(m, [{}, {}], 1 / 60);
  assert.equal(m.round, 2);
  assert.equal(m.players[1].alive, true);
  assert.equal(m.players[0].ammo, 2);
  assert.equal(m.players[0].score, 1);
});
test('cooldown, two-round capacity and reload are enforced', () => {
  const m = live();
  m.players[0].yaw = Math.PI / 2;
  shoot(m, 0);
  assert.equal(m.players[0].ammo, 1);
  assert.equal(shoot(m, 0), false);
  for (let i = 0; i < 31; i++) stepMatch(m, [{}, {}], 1 / 60);
  shoot(m, 0);
  assert.equal(m.players[0].ammo, 0);
  for (let i = 0; i < 31; i++) stepMatch(m, [{}, {}], 1 / 60);
  assert.equal(shoot(m, 0), false);
  assert.ok(m.players[0].reload > 0);
  for (let i = 0; i < 83; i++) stepMatch(m, [{}, {}], 1 / 60);
  assert.equal(m.players[0].ammo, 2);
});
test('diagonal movement does not exceed straight speed', () => {
  const p = createMatch().players[0],
    q = { ...p };
  Object.assign(p, { x: 0, z: 0, yaw: 0 });
  Object.assign(q, p);
  movePlayer(p, { forward: 1 }, empty, 1 / 60);
  movePlayer(q, { forward: 1, side: 1 }, empty, 1 / 60);
  assert.ok(Math.abs(Math.hypot(p.x, p.z) - Math.hypot(q.x, q.z)) < 1e-8);
});
test('walls block travel and low cover can be jumped onto', () => {
  const p = { ...createMatch().players[0], x: 0, y: 0, z: 3, yaw: 0 };
  const map = { size: 10, blocks: [{ x: 0, y: 0, z: 0, w: 3, d: 3, h: 1 }] };
  for (let i = 0; i < 60; i++) movePlayer(p, { forward: 1 }, map, 1 / 60);
  assert.ok(p.z >= 1.5 + RULES.radius - 0.001);
  for (let i = 0; i < 30; i++) movePlayer(p, { jump: i === 0, forward: 1 }, map, 1 / 60);
  assert.ok(p.y >= 1);
  for (let i = 0; i < 90; i++) movePlayer(p, {}, map, 1 / 60);
  assert.equal(p.y, 1);
  assert.equal(p.ground, true);
});
test('first to seven finishes the match; timeout is a draw', () => {
  const m = live();
  m.players[0].score = 6;
  shoot(m, 0);
  assert.equal(m.phase, 'finished');
  const draw = live();
  draw.timer = 0.001;
  stepMatch(draw, [{}, {}], 1 / 60);
  assert.equal(draw.winner, null);
  assert.equal(draw.players[0].score, 0);
});
test('arena rotation changes map and resets players', () => {
  const m = live();
  m.rotate = true;
  shoot(m, 0);
  for (let i = 0; i < 100; i++) stepMatch(m, [{}, {}], 1 / 60);
  assert.equal(m.mapId, MAPS[1].id);
});
test('bot traverses cover and can finish a match against an idle player', () => {
  const m = createMatch('airframe'),
    bot = createBot();
  for (let i = 0; i < 60 * 150 && m.phase !== 'finished'; i++)
    stepMatch(m, [{}, botInput(m, bot, 1 / 60, 'hard')], 1 / 60);
  assert.equal(m.players[1].score, 7);
  assert.equal(m.phase, 'finished');
});
