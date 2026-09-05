// Box geometry shared by rendering, collision and navigation. yaw is in radians.
export const block = (x, z, w, d, h = 3, kind = 'wall', y = 0, yaw = 0) => ({
  x,
  z,
  w,
  d,
  h,
  kind,
  y,
  yaw,
});
export const slab = (x, z, w, d, top, kind = 'deck', thickness = 0.3) =>
  block(x, z, w, d, thickness, kind, top - thickness);
export function stairs(x, z, width, length, bottom, top, axis = 'z', sign = 1) {
  const n = Math.ceil((top - bottom) / 0.25),
    out = [];
  for (let i = 0; i < n; i++) {
    const along = sign * (-length / 2 + ((i + 0.5) * length) / n);
    out.push(
      block(
        x + (axis === 'x' ? along : 0),
        z + (axis === 'z' ? along : 0),
        axis === 'x' ? length / n : width,
        axis === 'z' ? length / n : width,
        ((i + 1) / n) * (top - bottom),
        'step',
        bottom,
      ),
    );
  }
  return out;
}
export function room(
  x,
  z,
  w,
  d,
  height = 3,
  base = 0,
  door = 'south',
  kind = 'brick',
  roof = false,
) {
  const t = 0.4,
    gap = 2.4,
    out = [];
  for (const side of ['north', 'south']) {
    const zz = z + (side === 'north' ? -d / 2 : d / 2);
    if (side === door) {
      for (const sign of [-1, 1])
        out.push(block(x + (sign * (w + gap)) / 4, zz, (w - gap) / 2, t, height, kind, base));
    } else out.push(block(x, zz, w, t, height, kind, base));
  }
  for (const side of ['west', 'east']) {
    const xx = x + (side === 'west' ? -w / 2 : w / 2);
    if (side === door) {
      for (const sign of [-1, 1])
        out.push(block(xx, z + (sign * (d + gap)) / 4, t, (d - gap) / 2, height, kind, base));
    } else out.push(block(xx, z, t, d, height, kind, base));
  }
  if (roof) out.push(slab(x, z, w + 0.3, d + 0.3, base + height, 'roof'));
  return out;
}
export function ring(
  x,
  z,
  r,
  width,
  top,
  kind = 'deck',
  segments = 24,
  base = 0,
  start = 0,
  end = Math.PI * 2,
) {
  const out = [];
  for (let i = 0; i < segments; i++) {
    const a = start + ((end - start) * (i + 0.5)) / segments,
      len = 2 * r * Math.tan((end - start) / segments / 2) + 0.08;
    out.push(
      block(x + Math.sin(a) * r, z + Math.cos(a) * r, len, width, top - base, kind, base, a),
    );
  }
  return out;
}
export function localPoint(b, p) {
  const c = Math.cos(b.yaw || 0),
    s = Math.sin(b.yaw || 0),
    x = p.x - b.x,
    z = p.z - b.z;
  return { x: c * x - s * z, y: p.y, z: s * x + c * z };
}
export function overlaps(b, x, z, radius = 0.38) {
  const p = localPoint(b, { x, z });
  return Math.abs(p.x) < b.w / 2 + radius && Math.abs(p.z) < b.d / 2 + radius;
}
export const extents = (map) => map.extent || [map.size, map.size];
export function visibilityZone(map, p) {
  return (map.sightZones || []).findIndex((b) => overlaps(b, p.x, p.z, 0));
}
export const sharesVisibility = (map, a, b) => visibilityZone(map, a) === visibilityZone(map, b);
