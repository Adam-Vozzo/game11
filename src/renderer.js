import * as THREE from 'three';
import { getMap, THEMES } from './maps.js';
const V = THREE.Vector3;
export class World {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(84, innerWidth / innerHeight, 0.06, 180);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);
    this.effects = [];
    this.kick = 0;
    this.clock = 0;
    this.preview = true;
    this.scene.add(new THREE.HemisphereLight(0xeaf1db, 0x525747, 2.5));
    this.sun = new THREE.DirectionalLight(0xffe7ba, 3.4);
    this.sun.position.set(-25, 38, 15);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, {
      left: -40,
      right: 40,
      top: 40,
      bottom: -40,
      near: 1,
      far: 110,
    });
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.025;
    this.scene.add(this.sun);
    this.gun = this.makeGun();
    this.gun.scale.setScalar(0.65);
    this.camera.add(this.gun);
    this.opponent = this.makeOpponent();
    this.scene.add(this.opponent);
    this.opponent.visible = false;
    this.load('airframe');
    addEventListener('resize', () => this.resize());
    this.resize();
  }
  material(color, roughness = 0.85, metalness = 0) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
  }
  box(parent, x, y, z, w, h, d, color, cast = true) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      typeof color === 'number' ? this.material(color) : color,
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  cylinder(parent, x, y, z, rTop, rBottom, height, color, segments = 12) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(rTop, rBottom, height, segments),
      this.material(color),
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  label(parent, text, x, y, z, w, h, rotation = 0, bg = '#303e39', fg = '#e8efc5') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const c = canvas.getContext('2d');
    c.fillStyle = bg;
    c.fillRect(0, 0, 512, 128);
    c.fillStyle = fg;
    c.font = 'bold 65px Arial';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, 256, 66, 470);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map: texture, roughness: 1, side: THREE.DoubleSide }),
    );
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotation;
    parent.add(mesh);
    return mesh;
  }
  load(id) {
    if (this.level) {
      this.scene.remove(this.level);
      this.level.traverse((o) => {
        o.geometry?.dispose();
        if (o.material) {
          for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
            m.map?.dispose();
            m.dispose();
          }
        }
      });
    }
    this.map = getMap(id);
    const m = this.map,
      t = THEMES[m.theme];
    this.level = new THREE.Group();
    this.scene.add(this.level);
    const g = this.level;
    this.scene.background = new THREE.Color(t.sky);
    this.scene.fog = new THREE.Fog(t.fog, 45, 115);
    this.box(g, 0, -0.3, 0, m.size * 2, 0.6, m.size * 2, t.ground, false);
    // Thin seams and wear markings make scale and motion legible.
    for (let a = -m.size; a < m.size; a += 4) {
      this.box(g, a, 0.008, 0, 0.025, 0.01, m.size * 2, t.dark, false);
      this.box(g, 0, 0.009, a, m.size * 2, 0.01, 0.025, t.dark, false);
    }
    const wallHeight = ['metro', 'lab'].includes(m.theme) ? 7 : 2.5;
    for (const sign of [-1, 1]) {
      this.box(
        g,
        sign * (m.size + 0.35),
        wallHeight / 2,
        0,
        0.7,
        wallHeight,
        m.size * 2 + 1,
        t.wall,
      );
      this.box(g, 0, wallHeight / 2, sign * (m.size + 0.35), m.size * 2, wallHeight, 0.7, t.wall);
      this.box(g, sign * (m.size + 0.35), wallHeight + 0.08, 0, 0.8, 0.16, m.size * 2 + 1, t.dark);
      this.box(g, 0, wallHeight + 0.08, sign * (m.size + 0.35), m.size * 2, 0.16, 0.8, t.dark);
    }
    m.blocks.forEach((b, i) => {
      let color = ['wreck', 'train', 'bus', 'car'].includes(b.kind)
        ? t.accent
        : ['rock', 'shed', 'core'].includes(b.kind)
          ? t.dark
          : t.wall;
      const base = this.box(g, b.x, b.y + b.h / 2, b.z, b.w, b.h, b.d, color);
      this.box(g, b.x, b.y + b.h + 0.025, b.z, b.w + 0.08, 0.05, b.d + 0.08, t.dark);
      if (['wreck', 'train', 'bus'].includes(b.kind)) {
        for (let z = b.z - b.d / 2 + 1.8; z < b.z + b.d / 2 - 1; z += 2.3)
          for (const s of [-1, 1]) {
            this.box(
              g,
              b.x + s * (b.w / 2 + 0.015),
              b.y + b.h * 0.66,
              z,
              0.035,
              0.7,
              1.3,
              0x344e50,
            );
            this.box(g, b.x + s * (b.w / 2 + 0.02), 0.35, z, 0.06, 0.12, 1.9, t.dark);
          }
        if (b.kind === 'wreck') {
          const tail = this.box(g, b.x, 5, b.z + b.d / 2 - 2, 0.4, 4, 3, t.accent);
          tail.rotation.x = -0.18;
          this.label(g, 'EDC  /  01', b.x, 1.5, b.z - b.d / 2 - 0.02, 3, 0.75, Math.PI);
        } else {
          for (const z of [-1, 1])
            this.box(g, b.x, 2, b.z + z * (b.d / 2 + 0.02), b.w * 0.8, 1, 0.03, 0x344e50);
        }
      }
      if (['crate', 'vent', 'kiosk'].includes(b.kind)) {
        for (let y = 0.3; y < b.h; y += 0.4)
          this.box(g, b.x, b.y + y, b.z + b.d / 2 + 0.015, b.w * 0.8, 0.07, 0.025, t.dark);
      }
      if (b.kind === 'car') {
        this.box(g, b.x, 1.5, b.z, b.w * 0.5, 0.6, b.d * 0.9, 0x344e50);
        for (const s of [-1, 1])
          for (const z of [-1, 1]) {
            const wheel = this.cylinder(
              g,
              b.x + s * b.w * 0.32,
              0.4,
              b.z + z * b.d * 0.48,
              0.4,
              0.4,
              0.25,
              t.dark,
            );
            wheel.rotation.x = Math.PI / 2;
          }
      }
      if (['fountain', 'well'].includes(b.kind)) {
        this.cylinder(g, b.x, b.h + 0.05, b.z, 1.6, 1.6, 0.12, 0x84c6ba, 24);
        this.cylinder(g, b.x, b.h + 0.8, b.z, 0.25, 0.4, 1.6, t.wall);
      }
      if (['stall', 'hut', 'kiosk'].includes(b.kind)) {
        const roof = this.cylinder(
          g,
          b.x,
          b.h + 0.7,
          b.z,
          0,
          Math.max(b.w, b.d) * 0.77,
          1.4,
          i % 2 ? t.dark : t.accent,
          4,
        );
        roof.rotation.y = Math.PI / 4;
        this.box(g, b.x, b.h * 0.35, b.z + b.d / 2 + 0.02, 1.2, b.h * 0.7, 0.04, t.dark);
      }
      if (b.kind === 'rock') {
        this.box(g, b.x, b.h * 0.6, b.z, b.w * 0.94, b.h * 0.6, b.d * 0.94, t.dark);
      }
      if (['panel', 'core'].includes(b.kind)) {
        for (let y = 1; y < b.h; y += 1.2)
          this.box(g, b.x, y, b.z + b.d / 2 + 0.025, b.w * 0.96, 0.025, 0.015, t.dark);
        this.box(g, b.x, b.h - 0.2, b.z + b.d / 2 + 0.04, b.w * 0.65, 0.07, 0.035, t.accent);
      }
    });
    // Arena-specific dressing, kept outside collision paths or flat on the ground.
    for (let i = 0; i < 2; i++) {
      const s = m.spawn[i];
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.1, 1.2, 40),
        new THREE.MeshBasicMaterial({ color: i ? 0xf49277 : t.accent, side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(s[0], 0.025, s[2]);
      g.add(ring);
    }
    if (m.decor === 'plane') {
      for (const s of [-1, 1]) {
        this.label(g, 'CAUTION  //  LIVE RANGE', s * 16, 1.5, -m.size + 0.02, 8, 1);
        for (let i = 0; i < 7; i++) {
          const rock = this.cylinder(
            g,
            s * (m.size + 7 + i * 2),
            i % 3,
            Math.sin(i * 2) * 25,
            3,
            5,
            5 + (i % 4),
            t.wall,
            5,
          );
          rock.rotation.z = 0.15 * i;
        }
      }
    }
    if (['town', 'street', 'roof', 'school', 'qud'].includes(m.decor)) {
      for (let i = 0; i < 15; i++) {
        const angle = (i / 15) * Math.PI * 2,
          r = m.size + 10 + (i % 3) * 4,
          x = Math.sin(angle) * r,
          z = Math.cos(angle) * r,
          h = m.decor === 'roof' ? 8 + (i % 5) * 4 : 5 + (i % 4) * 2;
        this.box(g, x, h / 2 - 2, z, 6, h, 7, i % 2 ? t.dark : t.wall);
        for (let y = 1; y < h - 2; y += 2.5) {
          for (const offset of [-1.5, 1.5])
            this.box(g, x + offset, y - 2, z + 3.51, 0.8, 1, 0.03, t.accent, false);
        }
      }
    }
    if (m.decor === 'metro') {
      for (const s of [-1, 1]) {
        this.box(g, s * 4, 0.02, 0, 0.12, 0.04, m.size * 2, 0xddbd5f);
        this.box(g, s * 18, 6, 0, 0.2, 0.1, 40, 0xe8efd4);
        this.label(g, 'LAST TRAIN  /  PLATFORM ' + (s + 2), s * 14, 4, -m.size + 0.03, 11, 1.4);
      }
      this.box(g, 0, 7.3, 0, m.size * 2, 0.5, m.size * 2, t.dark);
    }
    if (m.decor === 'street') {
      for (let a = -20; a < 22; a += 5) {
        this.box(g, a, 0.025, 0, 2, 0.02, 0.13, t.accent);
        this.box(g, 0, 0.026, a, 0.13, 0.02, 2, t.accent);
      }
    }
    if (m.decor === 'school') {
      this.label(g, 'AFTER HOURS ATHLETICS', 0, 2, -m.size + 0.02, 14, 1.4);
      for (const s of [-1, 1]) {
        this.cylinder(g, s * 15, 4.5, -18, 0.08, 0.08, 9, t.dark);
        this.box(g, s * 15, 8.5, -18, 3, 0.15, 0.6, t.accent);
      }
    }
    if (m.decor === 'qud') {
      for (const s of [-1, 1])
        for (let i = 0; i < 6; i++) {
          const x = s * 19,
            z = -10 + i * 4;
          this.cylinder(g, x, 1, z, 0.17, 0.3, 2, t.dark, 5);
          const crown = this.cylinder(g, x, 2.2, z, 0, 1.2, 2, t.accent, 5);
          crown.rotation.z = s * 0.2;
        }
      this.label(g, 'SALT • WATER • LEAD', 0, 2.1, -m.size + 0.02, 11, 1.3);
    }
    if (m.decor === 'roof') {
      this.label(g, 'NO ACCESS', 0, 2, 4.52, 4, 1);
      this.cylinder(g, -17, 7, -17, 2, 2, 3, t.dark, 16);
      for (const x of [-18, -16]) this.box(g, x, 3.2, -17, 0.15, 6.4, 0.15, t.dark);
    }
    if (m.decor === 'lab') {
      this.label(g, '07  /  CONTROL GROUP', 0, 4, -m.size + 0.02, 15, 2, 0, '#d2d8c7', '#3a5156');
      for (const s of [-1, 1]) this.box(g, s * 20, 4, 0, 0.08, 0.16, 35, t.accent);
    }
    if (m.decor === 'river') {
      this.box(g, 0, 0.025, 8, 40, 0.03, 4, 0x82ada2);
      for (let i = 0; i < 8; i++) {
        const x = Math.sin(i * 2) * 31,
          z = Math.cos(i * 2) * 31;
        this.cylinder(g, x, 3, z, 0.4, 0.6, 6, t.dark);
        this.cylinder(g, x, 7, z, 0, 3.5, 7, t.dark, 6);
      }
    }
    if (m.decor === 'depot') {
      for (let x = -20; x <= 20; x += 5) this.box(g, x, 0.025, 0, 0.09, 0.03, 42, t.accent);
      this.label(g, 'TERMINAL VELOCITY', 0, 2, -m.size + 0.02, 15, 1.6);
      for (const s of [-1, 1]) this.label(g, s < 0 ? '01' : '02', s * 8, 2, s * 3 + 9.52, 2, 1.1);
    }
    this.label(
      g,
      m.name.toUpperCase(),
      0,
      1.4,
      m.size - 0.02,
      Math.min(15, m.name.length * 0.8),
      1.2,
      Math.PI,
    );
  }
  makeOpponent() {
    const g = new THREE.Group();
    const red = this.material(0xd77860),
      dark = this.material(0x303e3b);
    this.box(g, 0, 1.02, 0, 0.64, 0.76, 0.4, red);
    this.box(g, 0, 1.05, 0.22, 0.4, 0.55, 0.08, dark);
    this.cylinder(g, 0, 1.61, 0, 0.27, 0.25, 0.4, 0xe4dfbf);
    this.box(g, 0, 1.63, -0.235, 0.4, 0.12, 0.08, dark);
    for (const s of [-1, 1]) {
      this.box(g, s * 0.19, 0.37, 0, 0.23, 0.74, 0.26, dark);
      this.box(g, s * 0.4, 1.01, -0.1, 0.18, 0.62, 0.22, red);
    }
    this.box(g, 0.22, 1.1, -0.65, 0.12, 0.13, 0.9, dark);
    return g;
  }
  makeGun() {
    const g = new THREE.Group();
    const steel = this.material(0x44504b, 0.28, 0.8),
      wood = this.material(0x77533b, 0.63),
      edge = this.material(0xadb2a1, 0.25, 0.85);
    this.box(g, 0, -0.12, 0.02, 0.18, 0.24, 0.67, wood);
    this.box(g, 0, 0.005, -0.18, 0.2, 0.13, 0.52, steel);
    for (const s of [-1, 1]) {
      const barrel = this.cylinder(g, s * 0.062, 0.04, -0.65, 0.044, 0.049, 0.88, 0x333e3a, 16);
      barrel.rotation.x = Math.PI / 2;
      const bore = this.cylinder(g, s * 0.062, 0.04, -1.096, 0.03, 0.03, 0.009, 0x101918, 16);
      bore.rotation.x = Math.PI / 2;
      this.box(g, s * 0.062, 0.073, -0.33, 0.1, 0.025, 0.07, edge);
    }
    this.box(g, 0, 0.092, -0.99, 0.018, 0.075, 0.045, edge);
    this.box(g, 0, 0.095, -0.27, 0.018, 0.04, 0.15, edge);
    const grip = this.box(g, 0, -0.27, 0.05, 0.13, 0.24, 0.16, wood);
    grip.rotation.x = -0.3;
    this.box(g, 0.06, -0.21, -0.34, 0.25, 0.16, 0.24, 0xa69b76);
    this.box(g, 0.08, -0.29, 0.2, 0.25, 0.23, 0.26, 0xa69b76);
    g.position.set(0.31, -0.25, -0.35);
    g.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = false;
        o.receiveShadow = false;
      }
    });
    return g;
  }
  shot(event, localId) {
    const points = [
      new V(event.origin.x, event.origin.y, event.origin.z),
      new V(event.end.x, event.end.y, event.end.z),
    ];
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({
        color: event.player === localId ? 0xf4efa6 : 0xff9170,
        transparent: true,
        opacity: 0.9,
      }),
    );
    this.scene.add(line);
    this.effects.push({ object: line, life: 0.13, total: 0.13 });
    if (event.player === localId) this.kick = 1;
    const spark = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 4),
      new THREE.MeshBasicMaterial({ color: 0xffd58f }),
    );
    spark.position.copy(points[1]);
    this.scene.add(spark);
    this.effects.push({ object: spark, life: 0.17, total: 0.17 });
  }
  resize() {
    this.renderer.setSize(innerWidth, innerHeight);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  }
  render(dt, match, localId, input, settings) {
    this.clock += dt;
    this.kick = Math.max(0, this.kick - dt * 6);
    this.gun.visible = !!match;
    this.opponent.visible = !!match && match.players[1 - localId].alive;
    if (match) {
      const p = match.players[localId],
        o = match.players[1 - localId];
      this.camera.position.set(p.x, p.y + 1.48, p.z);
      this.camera.rotation.set(input.pitch, input.yaw, 0, 'YXZ');
      this.camera.rotation.x -= this.kick * 0.035;
      const moving = Math.abs(input.forward) + Math.abs(input.side) > 0 && match.phase === 'live';
      const bob = moving ? Math.sin(this.clock * 15) * 0.012 : Math.sin(this.clock * 2) * 0.003;
      this.gun.position.set(
        input.aim ? 0.06 : 0.31,
        -0.25 + bob - this.kick * 0.02,
        -0.5 + this.kick * 0.1,
      );
      this.gun.rotation.set(
        this.kick * 0.13 + (p.reload > 0 ? -Math.sin((p.reload / 1.35) * Math.PI) * 0.65 : 0),
        0,
        p.reload > 0 ? -0.4 : 0,
      );
      const fov = input.aim ? settings.fov * 0.75 : settings.fov + (input.sprint && moving ? 5 : 0);
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, fov, dt * 12);
      this.camera.updateProjectionMatrix();
      this.opponent.position.set(o.x, o.y, o.z);
      this.opponent.rotation.y = o.yaw;
    } else {
      const a = 0.68 + Math.sin(this.clock * 0.06) * 0.18;
      this.camera.position.set(Math.cos(a) * 33, 25, Math.sin(a) * 36);
      this.camera.lookAt(-1, 0, 0);
      this.camera.fov = 57;
      this.camera.updateProjectionMatrix();
    }
    this.effects = this.effects.filter((e) => {
      e.life -= dt;
      if (e.life <= 0) {
        this.scene.remove(e.object);
        e.object.geometry.dispose();
        e.object.material.dispose();
        return false;
      }
      if (e.object.material.transparent) e.object.material.opacity = e.life / e.total;
      return true;
    });
    this.renderer.render(this.scene, this.camera);
  }
}
