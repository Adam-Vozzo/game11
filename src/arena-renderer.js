import * as THREE from 'three';
import { THEMES } from './maps.js';
import { extents } from './geometry.js';

export function buildArena(world) {
  world.cutawayWalls = [];
  const m = world.map,
    t = THEMES[m.theme],
    g = world.level,
    [ex, ez] = extents(m);
  world.scene.background = new THREE.Color(t.sky);
  world.scene.fog = new THREE.Fog(t.fog, m.size * 1.8, m.size * 4.5);
  const shadow = m.size + 8;
  Object.assign(world.sun.shadow.camera, {
    left: -shadow,
    right: shadow,
    top: shadow,
    bottom: -shadow,
    far: 200,
  });
  world.sun.shadow.camera.updateProjectionMatrix();
  world.box(g, 0, -0.35, 0, ex * 2, 0.7, ez * 2, t.ground, false);
  for (let x = -ex; x <= ex; x += 4) world.box(g, x, 0.006, 0, 0.025, 0.012, ez * 2, t.dark, false);
  for (let z = -ez; z <= ez; z += 4) world.box(g, 0, 0.008, z, ex * 2, 0.012, 0.025, t.dark, false);
  // Bounds are deliberately visible. Source exits are sealed at the selected crop.
  const boundary = m.theme === 'roof' ? 0.1 : m.theme === 'lab' ? 0.15 : 1.2;
  for (const sign of [-1, 1]) {
    world.box(g, sign * (ex + 0.3), boundary / 2, 0, 0.6, boundary, ez * 2, t.dark);
    world.box(g, 0, boundary / 2, sign * (ez + 0.3), ex * 2, boundary, 0.6, t.dark);
  }
  for (const road of m.roads || []) {
    const mesh = world.box(g, road.x, 0.028, road.z, road.w, 0.035, road.d, 0x424a47, false);
    mesh.rotation.y = road.yaw;
  }
  for (const water of m.water || []) {
    world.box(
      g,
      water.x,
      0.05,
      water.z,
      water.w,
      0.06,
      water.d,
      m.theme === 'qud' ? 0x599c9b : 0x6b9990,
      false,
    );
  }
  const colors = {
    wreck: 0xb8bbb1,
    cockpit: 0x879895,
    tail: 0xa2ab99,
    wing: 0xa2ab99,
    cliff: t.wall,
    rock: t.dark,
    bank: t.ground,
    step: t.wall,
    deck: t.wall,
    awning: 0x638b88,
    gym: 0xbab291,
    school: 0xbab291,
    pool: 0x779da0,
    billboard: 0x4c5d60,
    concourse: 0x9aa89c,
    grating: 0x729c9d,
    catwalk: 0x7faaa5,
    ai: 0xbcc6b9,
    incinerator: 0xf4a04e,
    train: 0xb5bb99,
    bus: 0xbbd259,
    hut: 0xa7976f,
    shrine: 0xd2c79a,
    statue: 0xb9cfb6,
    workshop: 0x7c9780,
    shelter: 0x90baaa,
    overpass: 0x8da997,
    brick: 0x77736b,
    roof: 0x6c7b77,
    interior: 0x9da092,
    turnstile: 0x547a72,
  };
  for (const b of m.blocks) {
    const group = new THREE.Group();
    group.position.set(b.x, b.y, b.z);
    group.rotation.y = b.yaw || 0;
    g.add(group);
    const color = colors[b.kind] ?? (['building', 'shop'].includes(b.kind) ? t.wall : t.dark);
    const body = world.box(group, 0, b.h / 2, 0, b.w, b.h, b.d, color);
    if (m.theme === 'lab' && b.kind === 'panel' && b.h > 10) {
      world.cutawayWalls.push(body);
    }
    if (b.kind === 'step') {
      world.box(group, 0, b.h + 0.003, 0, b.w, 0.006, 0.035, t.accent, false);
      continue;
    }
    if (
      ['deck', 'concourse', 'catwalk', 'grating', 'roof', 'awning', 'overpass', 'shelter'].includes(
        b.kind,
      )
    ) {
      world.box(group, 0, b.h + 0.009, 0, b.w, 0.018, 0.035, t.dark, false);
      if (['awning', 'overpass', 'shelter'].includes(b.kind)) {
        for (const sign of [-1, 1])
          world.box(g, b.x, b.y / 2, b.z + sign * (b.d / 2 - 0.6), 0.15, b.y, 0.15, t.dark);
      }
    }
    if (['building', 'billboard', 'shop', 'school', 'gym'].includes(b.kind)) {
      for (let x = -b.w / 2 + 1; x < b.w / 2; x += 2.5)
        for (let y = 1.7; y < b.h - 0.3; y += 2.5) {
          world.box(group, x, y, b.d / 2 + 0.012, 0.7, 0.8, 0.025, t.dark, false);
          world.box(group, x, y, -b.d / 2 - 0.012, 0.7, 0.8, 0.025, t.dark, false);
        }
      world.box(group, 0, b.h + 0.04, 0, b.w + 0.1, 0.08, b.d + 0.1, t.dark);
      if (b.kind === 'billboard' && b.d > 2) {
        world.box(group, 0, b.h * 0.65, b.d / 2 + 0.04, b.w * 0.92, 2, 0.08, t.accent);
      }
      if (b.kind === 'shop') {
        const roof = world.cylinder(group, 0, b.h + 0.75, 0, 0, 1, 1.5, t.dark, 4);
        roof.scale.set(b.w * 0.72, 1, b.d * 0.72);
        roof.rotation.y = Math.PI / 4;
      }
    }
    if (['wreck', 'train', 'bus'].includes(b.kind) && b.h > 1.5) {
      if (b.w < 1) {
        for (let z = -b.d / 2 + 1; z < b.d / 2 - 0.5; z += 2)
          for (const sign of [-1, 1])
            world.box(
              group,
              sign * (b.w / 2 + 0.01),
              b.h * 0.68,
              z,
              0.025,
              0.65,
              1,
              0x314a4e,
              false,
            );
      } else if (b.w > 1 && b.d > 5) {
        for (let z = -b.d / 2 + 1.5; z < b.d / 2 - 1; z += 2)
          for (const sign of [-1, 1])
            world.box(
              group,
              sign * (b.w / 2 + 0.02),
              b.h * 0.67,
              z,
              0.03,
              0.8,
              1.2,
              0x314a4e,
              false,
            );
      }
    }
    if (['vent', 'ticket', 'kiosk', 'crate'].includes(b.kind))
      for (let y = 0.25; y < b.h; y += 0.4)
        world.box(group, 0, y, b.d / 2 + 0.015, b.w * 0.85, 0.07, 0.03, t.wall, false);
    if (b.kind === 'fountain') {
      world.cylinder(group, 0, b.h + 0.05, 0, 1.65, 1.65, 0.1, 0x8bc1b5, 24);
      world.cylinder(group, 0, b.h + 0.7, 0, 0.2, 0.35, 1.4, t.wall);
    }
    if (b.kind === 'car') {
      world.box(group, 0, b.h + 0.3, 0, b.w * 0.85, 0.6, b.d * 0.55, 0x50726d);
    }
    if (b.kind === 'ai') {
      for (let i = 0; i < 5; i++) {
        const cable = world.cylinder(group, (i - 2) * 0.45, b.h + 1, 0, 0.06, 0.06, 2.5, t.dark);
        cable.rotation.z = (i - 2) * 0.1;
      }
      world.cylinder(group, 0, -0.15, 0, 0.8, 0.5, 0.5, t.accent, 12);
    }
    if (b.kind === 'turnstile') world.box(group, 0, b.h + 0.01, 0, 0.2, 0.02, 0.5, t.accent);
    if (b.kind === 'skylight')
      world.box(group, 0, b.h + 0.01, 0, b.w * 0.8, 0.025, b.d * 0.8, 0x528080);
  }
  for (const item of m.labels || []) {
    const mesh = world.label(
      g,
      item.text,
      item.x,
      item.y,
      item.z,
      item.w,
      Math.min(1.1, item.w / 7),
      item.yaw,
    );
    if (item.text === 'SOS') {
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(-5, 4.03, 6);
    }
  }
  m.spawn.forEach((s, i) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 1.18, 32),
      new THREE.MeshBasicMaterial({ color: i ? 0xf0a083 : t.accent, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(s[0], s[1] + 0.025, s[2]);
    g.add(ring);
  });
  if (['city', 'roof', 'depot'].includes(m.theme))
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2,
        r = m.size + 18,
        x = Math.sin(a) * r,
        z = Math.cos(a) * r,
        h = 12 + (i % 5) * 6;
      world.box(g, x, h / 2 - 8, z, 7, h, 8, t.dark);
    }
  if (m.theme === 'qud')
    for (let i = 0; i < 26; i++) {
      const x = -36 + ((i * 13) % 72),
        z = i % 2 ? 21 : -22;
      if (
        (m.blocks || []).some(
          (b) => Math.abs(b.x - x) < b.w / 2 + 1 && Math.abs(b.z - z) < b.d / 2 + 1,
        )
      )
        continue;
      world.cylinder(g, x, 1.2, z, 0.12, 0.18, 2.4, t.dark, 6);
      world.cylinder(g, x, 2.5, z, 0.2, 1.1, 2, t.accent, 6);
    }
  if (m.theme === 'school') {
    for (const [x, z, w, d] of [
      [-29, -26, 12, 17],
      [-12, -27, 11, 11],
    ])
      world.box(g, x, 0.025, z, w, 0.04, d, 0x718f96, false);
  }
  if (m.theme === 'metro') {
    for (const x of [-8, 8]) world.box(g, x, 0.015, 14, 0.12, 0.03, 38, 0xe6cf7d);
    for (let z = -29; z < 32; z += 10)
      world.box(g, 0, z < -12 ? 9 : 5.5, z, 25, 0.08, 0.2, t.accent, false);
  }
  world.fogCurtain = null;
  if (m.fogGate) {
    const f = m.fogGate,
      curtain = new THREE.Mesh(
        new THREE.PlaneGeometry(f.w, f.h),
        new THREE.MeshBasicMaterial({
          color: 0x172a27,
          transparent: true,
          opacity: 0.87,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
    curtain.position.set(f.x, f.h / 2, f.z);
    g.add(curtain);
    world.fogCurtain = curtain;
  }
}
