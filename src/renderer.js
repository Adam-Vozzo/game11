import * as THREE from 'three';
import { getMap } from './maps.js';
import { buildArena } from './arena-renderer.js';
import { sharesVisibility } from './geometry.js';
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
    this.level = new THREE.Group();
    this.scene.add(this.level);
    buildArena(this);
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
    for (const wall of this.cutawayWalls || []) {
      wall.material.transparent = !match;
      wall.material.opacity = match ? 1 : 0.12;
      wall.material.depthWrite = !!match;
    }
    this.clock += dt;
    this.kick = Math.max(0, this.kick - dt * 6);
    this.gun.visible = !!match;
    this.opponent.visible =
      !!match &&
      match.players[1 - localId].alive &&
      sharesVisibility(this.map, match.players[localId], match.players[1 - localId]);
    if (this.fogCurtain) this.fogCurtain.visible = !!match;
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
      const scale = this.map.size / 23;
      this.camera.position.set(Math.cos(a) * 33 * scale, 28 * scale, Math.sin(a) * 36 * scale);
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
