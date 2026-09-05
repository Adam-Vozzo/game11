import * as THREE from 'three';
import { getMap } from './maps.js';
import { buildArena } from './arena-renderer.js';
import { sharesVisibility } from './geometry.js';
import { RULES } from './simulation.js';
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
    const shell = this.material(0x293b41, 0.32, 0.75),
      edge = this.material(0xb4c4bf, 0.23, 0.85),
      gripMaterial = this.material(0x162225, 0.8);
    this.coil = new THREE.MeshStandardMaterial({
      color: 0x68edff,
      emissive: 0x29dfff,
      emissiveIntensity: 2.8,
      roughness: 0.2,
    });
    this.box(g, 0, -0.07, 0.02, 0.23, 0.24, 0.62, shell);
    this.box(g, 0, -0.09, 0.3, 0.27, 0.27, 0.12, gripMaterial);
    this.box(g, 0, 0.055, -0.29, 0.28, 0.23, 0.43, edge);
    this.box(g, 0, 0.04, -0.74, 0.09, 0.09, 0.78, gripMaterial);
    for (const side of [-1, 1]) {
      this.box(g, side * 0.11, 0.04, -0.76, 0.075, 0.13, 0.88, shell);
      this.box(g, side * 0.15, 0.065, -0.77, 0.015, 0.035, 0.72, this.coil);
      for (let i = 0; i < 5; i++)
        this.box(g, side * 0.115, 0.04, -0.48 - i * 0.135, 0.105, 0.17, 0.035, edge);
    }
    this.box(g, 0, 0.04, -1.2, 0.32, 0.22, 0.09, shell);
    this.box(g, 0, 0.04, -1.249, 0.085, 0.075, 0.012, this.coil);
    this.box(g, 0, 0.195, -0.27, 0.06, 0.07, 0.12, gripMaterial);
    this.box(g, 0, 0.235, -0.3, 0.028, 0.025, 0.04, this.coil);
    const grip = this.box(g, 0, -0.28, 0.05, 0.14, 0.28, 0.17, gripMaterial);
    grip.rotation.x = -0.3;
    this.box(g, 0.06, -0.21, -0.34, 0.25, 0.16, 0.24, 0xa69b76);
    this.box(g, 0.08, -0.29, 0.2, 0.25, 0.23, 0.26, 0xa69b76);
    this.muzzle = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 12, 8),
      new THREE.MeshBasicMaterial({
        color: 0xb8faff,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.muzzle.position.set(0, 0.04, -1.31);
    this.muzzle.visible = false;
    g.add(this.muzzle);
    this.muzzleLight = new THREE.PointLight(0x75eeff, 0, 7, 2);
    this.muzzleLight.position.copy(this.muzzle.position);
    g.add(this.muzzleLight);
    g.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = false;
        o.receiveShadow = false;
      }
    });
    return g;
  }
  shot(event, localId) {
    const local = event.player === localId;
    const start = new V(event.origin.x, event.origin.y, event.origin.z);
    const end = new V(event.end.x, event.end.y, event.end.z);
    if (local && start.distanceTo(end) > 2) this.muzzle.getWorldPosition(start);
    const delta = end.clone().sub(start),
      length = delta.length();
    const color = local ? 0x63eaff : 0xff8d68;
    for (const [radius, tint, duration] of [
      [0.025, 0xf0ffff, 0.13],
      [0.04, color, 0.3],
    ]) {
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, Math.max(0.001, length), 8),
        new THREE.MeshBasicMaterial({
          color: tint,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      beam.position.copy(start).addScaledVector(delta, 0.5);
      if (length > 0) beam.quaternion.setFromUnitVectors(new V(0, 1, 0), delta.clone().normalize());
      this.scene.add(beam);
      this.effects.push({ object: beam, life: duration, total: duration });
    }
    if (local) this.kick = 1;
    for (let i = 0; i < 12; i++) {
      const spark = new THREE.Mesh(
        new THREE.SphereGeometry(i === 0 ? 0.2 : 0.035, 6, 4),
        new THREE.MeshBasicMaterial({
          color: i === 0 ? 0xffffff : color,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      spark.position.copy(end);
      this.scene.add(spark);
      const life = i === 0 ? 0.16 : 0.25 + Math.random() * 0.2;
      this.effects.push({
        object: spark,
        life,
        total: life,
        velocity: new V((Math.random() - 0.5) * 8, Math.random() * 6, (Math.random() - 0.5) * 8),
      });
    }
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
    this.kick = Math.max(0, this.kick - dt * 4.5);
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
      this.camera.rotation.x += this.kick * 0.065;
      this.camera.rotation.z = Math.sin(this.clock * 95) * this.kick * 0.008;
      this.muzzle.visible = this.kick > 0.65;
      this.muzzle.scale.setScalar(0.7 + this.kick * 1.7);
      this.muzzle.material.opacity = this.kick;
      this.muzzleLight.intensity = this.kick > 0.65 ? this.kick * 12 : 0;
      const charge = p.reload > 0 ? 1 - p.reload / RULES.reload : p.ammo;
      this.coil.emissiveIntensity = 0.15 + charge * 2.65;
      const moving = Math.abs(input.forward) + Math.abs(input.side) > 0 && match.phase === 'live';
      const bob = moving ? Math.sin(this.clock * 15) * 0.012 : Math.sin(this.clock * 2) * 0.003;
      this.gun.position.set(
        input.aim ? 0.06 : 0.31,
        -0.25 + bob + this.kick * 0.045,
        -0.5 + this.kick * 0.24,
      );
      this.gun.rotation.set(
        this.kick * 0.32 +
          (p.reload > 0 ? -Math.sin((p.reload / RULES.reload) * Math.PI) * 0.12 : 0),
        0,
        p.reload > 0 ? -Math.sin((p.reload / RULES.reload) * Math.PI) * 0.08 : 0,
      );
      const fov = input.aim ? settings.fov * 0.75 : settings.fov + (input.sprint && moving ? 5 : 0);
      this.camera.fov = THREE.MathUtils.lerp(
        this.camera.fov,
        fov + this.kick * 3,
        Math.min(1, dt * 12),
      );
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
      if (e.velocity) e.object.position.addScaledVector(e.velocity, dt);
      if (e.object.material.transparent) e.object.material.opacity = e.life / e.total;
      return true;
    });
    this.renderer.render(this.scene, this.camera);
  }
}
