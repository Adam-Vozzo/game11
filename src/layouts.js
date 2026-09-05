import { block as b, slab as deck, stairs, room, ring } from './geometry.js';
// Positions and elevations are measured by eye from the references in docs/map-research.md.
// They are not extracted source coordinates or claims of 1:1 scale.
const label = (text, x, z, y = 1.8, yaw = 0, w = 7) => ({ text, x, z, y, yaw, w });

export const LAYOUTS = {
  airframe: {
    extent: [30, 38],
    spawn: [
      [-12, 0, -26],
      [23, 0, 12],
    ],
    elevation: 6,
    reference: 'Afghan · MW2 (2009)',
    fidelity: 'Crash-site crop · approximate scale',
    description:
      'Walk through the broken aircraft, climb its wing, or take the cliff and cave routes above the crash basin.',
    blocks: [
      // The plane is a hollow route, split into three sections rather than a solid box.
      ...[-7, 7].flatMap((z) => [
        deck(0, z, 5, 9, 0.3, 'wreck'),
        b(-2.5, z, 0.35, 9, 2.5, 'wreck', 0.3),
        b(2.5, z, 0.35, 9, 2.5, 'wreck', 0.3),
        deck(0, z, 5, 9, 3, 'wreck'),
      ]),
      b(0, -14, 4, 3, 2.2, 'cockpit'),
      b(0, 13, 0.35, 5, 5, 'tail'),
      deck(-7, 3, 9, 3, 1, 'wing'),
      deck(7, 3, 9, 3, 1, 'wing'),
      ...stairs(-7, 6, 3, 5, 0, 1, 'z', -1),
      ...stairs(7, 1, 3, 4, 1, 3, 'z', -1),
      b(-25, -4, 10, 28, 6, 'cliff'),
      b(-24, -28, 12, 10, 6, 'cliff'),
      ...stairs(-18, -23, 5, 10, 0, 6, 'z', 1),
      deck(-18, -13, 5, 10, 6, 'cliff'),
      b(3, -23, 13, 8, 4, 'rock'),
      b(-9, 17, 9, 10, 5, 'rock'),
      // Cave has an open northern mouth and a western return exit under a ceiling.
      b(17, 25, 1, 18, 6, 'cliff'),
      b(6, 34, 23, 1, 6, 'cliff'),
      b(-5, 29, 1, 10, 6, 'cliff'),
      deck(6, 25, 23, 18, 6, 'cliff', 1),
      b(5, 17, 7, 1, 6, 'cliff'),
      ...stairs(20, 25, 5, 16, 0, 6, 'z', 1),
      deck(20, 35, 5, 4, 6, 'cliff'),
      ...room(23, -12, 10, 12, 3, 2, 'south', 'bunker', true),
      deck(23, -12, 10, 12, 2, 'cliff', 2),
      ...stairs(23, -3, 4, 6, 0, 2, 'z', -1),
      b(-10, -5, 2, 2, 1.1, 'crate'),
      b(10, 10, 2, 2, 1.1, 'crate'),
    ],
    labels: [
      label('HIGH LEDGE', -25, -8, 6.1),
      label('CAVE', 6, 16.4, 3.2),
      label('BUNKER', 23, -5.8, 3.8),
      label('AFGHAN / CRASH SITE', 0, -37.5, 2.5, 0, 15),
    ],
  },

  market: {
    extent: [29, 29],
    spawn: [
      [5, 0, 24],
      [-21, 0, -18],
    ],
    elevation: 0,
    reference: 'Market · Ocarina of Time (child, N64)',
    fidelity: 'Square and western alley · approximate scale',
    description:
      'The fountain anchors an open square. Perimeter shops, the western back alley, and castle and temple approaches replace the old symmetrical stalls.',
    blocks: [
      b(5, 0, 3.8, 3.8, 1, 'fountain'),
      b(-9, -20, 18, 8, 5, 'shop'),
      b(13, -20, 8, 8, 5, 'shop'),
      b(24, -2, 8, 20, 5, 'shop'),
      b(24, 13, 8, 8, 5, 'shop'),
      b(-13, 2, 12, 18, 5, 'shop'),
      b(-14, 22, 20, 10, 5, 'shop'),
      b(15, 22, 12, 10, 5, 'shop'),
      b(-27, 0, 3, 56, 5, 'building'),
      b(-17, -9, 4, 4, 5, 'shop'),
      b(-18, 13, 5, 4, 5, 'shop'),
      b(5, -27, 1, 4, 1, 'bollard'),
      b(21, -20, 3, 8, 0.3, 'step'),
      ...stairs(20, -12, 3, 5, 0, 1, 'z', -1),
      deck(24, -17, 8, 4, 1),
    ],
    labels: [
      label('SHOOTING GALLERY', -9, -15.8, 2.5, 0, 11),
      label('MASK SHOP', 13, -15.8, 2.4),
      label('POTION SHOP', 19.8, -5, 2.5, -Math.PI / 2),
      label('BAZAAR', 19.8, 12, 2.5, -Math.PI / 2),
      label('BOMBCHU BOWLING', -6.8, -1, 2.5, Math.PI / 2),
      label('CASTLE', 5, -27, 3),
      label('TEMPLE OF TIME', 24, -22, 3),
      label('BACK ALLEY', -22, 10, 2),
      label('HYRULE FIELD', 5, 28, 2.5, Math.PI),
    ],
  },

  platform: {
    extent: [22, 37],
    spawn: [
      [-10, 0, 28],
      [9, 4, -25],
    ],
    elevation: 4,
    reference: 'Operation Metro · Battlefield 3',
    fidelity: 'Platform–escalator–ticket hall crop',
    description:
      'Two train platforms feed paired escalators, a separate side stair, and an elevated ticket hall. Fight below, above, or through the service flank.',
    blocks: [
      b(0, 15, 4, 31, 2.8, 'train'),
      b(-20, 15, 2, 40, 5, 'wall'),
      b(20, 15, 2, 40, 5, 'wall'),
      deck(0, -24, 40, 24, 4, 'concourse', 4),
      ...stairs(-4, -6, 3, 12, 0, 4, 'z', -1),
      ...stairs(1, -6, 3, 12, 0, 4, 'z', -1),
      ...stairs(15, -6, 4, 12, 0, 4, 'z', -1),
      b(-6.1, -6, 0.3, 12, 1, 'rail'),
      b(3.1, -6, 0.3, 12, 1, 'rail'),
      b(9, -3, 1, 18, 5, 'wall'),
      ...[-15, -5, 5, 15].map((x) => b(x, -20, 1, 1, 4, 'pillar', 4)),
      ...[-12, 0, 12].map((z) => b(-12, z, 1, 1, 4, 'pillar')),
      ...[-13, -9, -5, -1, 3, 7].map((x) => b(x, -17, 0.55, 2, 1, 'turnstile', 4)),
      b(-13, -27, 8, 5, 3, 'ticket', 4),
      b(10, -31, 5, 5, 2.8, 'kiosk', 4),
      b(-15, 5, 2, 3, 1, 'bench'),
      b(13, 19, 2, 3, 1, 'bench'),
    ],
    labels: [
      label('TICKET HALL / B', 0, -35, 6.6, 0, 15),
      label('SORTIE ↑', 9, -12.1, 6.5, Math.PI),
      label('PLATFORMS / C', -10, 34, 3, Math.PI, 12),
    ],
  },

  crossroads: {
    extent: [32, 38],
    spawn: [
      [-10, 0, 31],
      [13, 0, -30],
    ],
    elevation: 0.25,
    reference: 'Star Junction · Grand Theft Auto IV',
    fidelity: 'Burlesque / Denver-Exeter / Kunzite crop',
    description:
      'Burlesque cuts diagonally across Denver–Exeter Avenue at Kunzite Street, between narrow billboard buildings and broad crossings.',
    blocks: [
      b(-25, -22, 12, 28, 15, 'building'),
      b(25, 22, 12, 28, 18, 'building'),
      b(24, -24, 13, 25, 20, 'building'),
      b(-25, 24, 12, 25, 17, 'building'),
      // Narrow wedge-shaped blocks between the straight and diagonal avenues.
      ...Array.from({ length: 11 }, (_, i) => {
        const z = -35 + i * 2.5;
        return b(
          -7 + z * 0.13,
          z,
          Math.max(1.3, Math.abs(z) * 0.23),
          2.5,
          11 + i * 0.25,
          'billboard',
        );
      }),
      ...Array.from({ length: 11 }, (_, i) => {
        const z = 10 + i * 2.5;
        return b(7 + z * 0.13, z, Math.max(1.3, z * 0.23), 2.5, 12, 'billboard');
      }),
      b(-11, 13, 2.4, 5, 1.1, 'car', 0, -0.25),
      b(9, -10, 2.4, 5, 1.1, 'car'),
      b(-22, -3, 4, 2, 1, 'kiosk'),
      b(22, 3, 4, 2, 1, 'kiosk'),
      b(-20, 0, 3, 8, 0.25, 'sidewalk'),
      b(20, 0, 3, 8, 0.25, 'sidewalk'),
    ],
    roads: [
      { x: 0, z: 0, w: 11, d: 76, yaw: 0 },
      { x: 0, z: 0, w: 10, d: 80, yaw: -0.25 },
      { x: 0, z: 0, w: 64, d: 11, yaw: 0 },
    ],
    labels: [
      label('STAR JUNCTION', -12, -13, 10, 0.25, 12),
      label('BURLESQUE', -8, -30, 5, 0, 9),
      label('KUNZITE ST', 25, -7, 4, 0, 8),
      label('DENVER–EXETER', 0, 37, 3, Math.PI, 12),
    ],
  },

  schoolyard: {
    extent: [40, 43],
    spawn: [
      [7, 4.5, 21.8],
      [-29, 0, -27],
    ],
    elevation: 6,
    reference: 'School · Tony Hawk’s Pro Skater (1999)',
    fidelity: 'Full landmark arrangement · compressed distances',
    description:
      'Start on the awning, reach the gym roof, cross the drainage ditch on footbridges, then drop through the courtyard to the two empty pools.',
    blocks: [
      // Upper gym / awning complex south-east; pools west, courtyard north-east.
      b(17, 32, 32, 18, 6, 'gym'),
      b(12, 9, 20, 13, 3.5, 'school'),
      b(-8, -7, 15, 18, 3.5, 'school'),
      b(-24, -13, 14, 5, 3.5, 'school'),
      deck(17, 18, 3, 21, 4.5, 'awning'),
      deck(7, 23, 23, 3, 4.5, 'awning'),
      ...stairs(33, 24, 4, 18, 0, 6, 'z', 1),
      ...stairs(22, 22, 3, 6, 4.5, 6, 'x', 1),
      b(21, 33, 6, 5, 1.6, 'vent', 6),
      b(7, 32, 4, 5, 1, 'skylight', 6),
      ...stairs(17, 4, 4, 10, 0, 4.5, 'z', 1),
      // Raised margins form the ditch; three elevated bridges leave a traversable channel.
      b(6, -13, 3, 20, 1.5, 'bank'),
      b(15, -13, 3, 20, 1.5, 'bank'),
      ...[-20, -12, -4].map((z) => deck(10.5, z, 10, 2.6, 2, 'bridge')),
      ...stairs(10.5, -27, 5, 7, 0, 2, 'z', 1),
      ...stairs(10.5, 3, 5, 7, 0, 2, 'z', -1),
      // Pool borders and short stairs recreate bowls as lowered pockets.
      ...room(-29, -26, 13, 18, 1.2, 0, 'east', 'pool'),
      ...stairs(-22, -26, 3, 4, 0, 1.2, 'x', -1),
      ...room(-12, -27, 12, 12, 1.2, 0, 'south', 'pool'),
      ...stairs(-12, -20, 3, 4, 0, 1.2, 'z', -1),
      b(23, -29, 18, 1, 2, 'graffiti'),
      b(17, -13, 3, 3, 0.8, 'planter'),
      b(27, -9, 3, 3, 0.8, 'planter'),
      ...[
        [4, 20],
        [25, 1],
        [0, -4],
        [-21, -16],
        [22, -24],
      ].map(([x, z]) => b(x, z, 3, 1.5, 0.8, 'table')),
      ...stairs(-35, 25, 4, 10, 0, 3.5, 'z', -1),
      deck(-35, 13, 4, 14, 3.5, 'ledge'),
    ],
    labels: [
      label('GYM ROOF', 17, 23, 7, Math.PI, 10),
      label('SCHOOL / MIAMI', 20, -42, 3, 0, 16),
      label('POOL DECK', -25, -37, 2),
      label('COURTYARD', 23, -28.4, 1.4, 0, 11),
    ],
  },

  saltwell: {
    extent: [40, 25],
    spawn: [
      [-31, 0, -8],
      [26, 0, 14],
    ],
    elevation: 0,
    reference: 'Joppa · Caves of Qud',
    fidelity: 'Static village footprint · approximate wall dimensions',
    description:
      'The northern elder compound, scattered open huts, southwest workshop, northwest pond, and northeast shrine follow Joppa’s fixed village arrangement.',
    blocks: [
      ...room(-20, -16, 4, 8, 3, 0, 'west', 'hut'),
      ...room(-20, -3, 4, 8, 3, 0, 'west', 'hut'),
      ...room(-7, 0, 5, 8, 3, 0, 'east', 'hut'),
      ...room(-7, 13, 5, 8, 3, 0, 'east', 'hut'),
      ...room(9, -1, 6, 10, 3, 0, 'west', 'hut'),
      ...room(20, 3, 6, 11, 3, 0, 'south', 'hut'),
      ...room(30, 8, 5, 9, 3, 0, 'south', 'hut'),
      ...room(1, -17, 21, 10, 3, 0, 'south', 'hut'),
      b(-3, -18, 0.4, 7, 3, 'hut'),
      b(5, -20, 0.4, 4, 3, 'hut'),
      ...room(-31, 16, 11, 8, 3, 0, 'north', 'workshop'),
      b(-31, 18, 6, 1, 1, 'workbench'),
      b(34, 15, 0.3, 7, 1, 'fence'),
      b(31, 19, 6, 0.3, 1, 'fence'),
      b(-33, -8, 2, 1, 1, 'mill'),
      ...room(30, -16, 3, 6, 1.2, 0, 'south', 'shrine'),
      b(30, -16, 0.8, 0.8, 2.5, 'statue'),
    ],
    water: [
      { x: -34, z: -14, w: 3, d: 12 },
      { x: 30, z: -16, w: 9, d: 11 },
      { x: -23, z: 21, w: 4, d: 3 },
      { x: 10, z: 19, w: 12, d: 3 },
    ],
    labels: [
      label('ELDER IRUDAD', 1, -11.7, 2.4, 0, 11),
      label('ARGYVE', -31, 11.6, 2.3, Math.PI),
      label('RESHEPH', 30, -20, 3),
      label('JOPPA', 0, 24, 2, Math.PI),
    ],
  },

  highrise: {
    extent: [19, 23],
    spawn: [
      [-12, 4, -20],
      [12, 4, 15],
    ],
    elevation: 7,
    reference: 'No Mercy · apartment starting roof (L4D)',
    fidelity: 'Starting roof + playable top-floor crop',
    description:
      'The SOS roof now has its stairwell shed, two skylights, supplies, and a lower apartment route. Drop through a skylight and climb the stairs back up.',
    blocks: [
      // Roof slabs leave two genuine openings into the apartment floor below.
      deck(0, -17, 36, 10, 4, 'roof'),
      deck(0, 17, 36, 10, 4, 'roof'),
      deck(0, 0, 13, 24, 4, 'roof'),
      deck(-16, 0, 4, 24, 4, 'roof'),
      deck(16, 0, 4, 24, 4, 'roof'),
      deck(-10, 8, 7, 8, 4, 'roof'),
      deck(10, -8, 7, 8, 4, 'roof'),
      b(-18, 0, 0.5, 44, 5, 'brick'),
      b(18, 0, 0.5, 44, 5, 'brick'),
      b(0, -22, 36, 0.5, 5, 'brick'),
      b(0, 22, 36, 0.5, 5, 'brick'),
      ...room(4, -10, 7, 8, 3, 4, 'south', 'shed', true),
      ...stairs(4, 0, 3, 12, 0, 4, 'z', -1),
      b(-5, 0, 0.3, 24, 3, 'interior'),
      b(9, 5, 14, 0.3, 3, 'interior'),
      b(-9, -16, 4, 2, 1, 'table', 4),
      b(-13, -16, 3, 2, 1, 'crate', 4),
      b(10, 8, 3, 3, 1.1, 'vent', 4),
      ...stairs(-12, 13, 3, 7, 0, 4, 'z', 1),
    ],
    labels: [label('ROOF ACCESS', 4, -5.8, 5.5, 0, 6), label('SOS', -4, 10, 4.03, 0, 7)],
    floorLabels: true,
  },

  chamber: {
    extent: [23, 29],
    spawn: [
      [-11, 0, 14],
      [12, 0, -12],
    ],
    elevation: 8,
    reference: 'Central AI Chamber · Portal (2007)',
    fidelity: 'Boss room · inferred proportions',
    description:
      'A suspended AI hangs above a circular platform and curved stairs. The rear incinerator booth and upper maintenance gallery create a second fighting height.',
    blocks: [
      ...ring(0, 0, 21, 1, 13, 'panel', 32).filter((b) => !(b.z < -19 && Math.abs(b.x) < 6)),
      ...ring(0, 0, 6.5, 3, 2.5, 'grating', 24, 2.15),
      ...Array.from({ length: 12 }, (_, i) => {
        const a = -Math.PI * 0.8 + i * 0.11;
        return b(Math.sin(a) * 9, Math.cos(a) * 9, 1.05, 3, ((i + 1) * 2.5) / 12, 'step', 0, a);
      }),
      b(
        Math.sin(-Math.PI * 0.8 + 1.21) * 7.8,
        Math.cos(-Math.PI * 0.8 + 1.21) * 7.8,
        0.85,
        3.5,
        0.15,
        'grating',
        2.35,
        -Math.PI * 0.8 + 1.21,
      ),
      b(0, 0, 2.5, 3, 6, 'ai', 4),
      ...room(0, -24, 10, 8, 4, 0, 'south', 'booth', true),
      b(0, -14, 3, 3, 0.5, 'incinerator'),
      ...stairs(-13, -5, 3, 16, 0, 8, 'z', -1),
      deck(-7, -14, 14, 3, 8, 'catwalk'),
      deck(7, -14, 14, 3, 8, 'catwalk'),
      b(-14, -14, 0.3, 3, 1, 'rail', 8),
      b(14, -14, 0.3, 3, 1, 'rail', 8),
      b(-17, 7, 3, 3, 2, 'pipe'),
      b(16, -3, 3, 3, 2, 'pipe'),
    ],
    labels: [
      label('CENTRAL AI CHAMBER', 0, 20.4, 4, Math.PI, 16),
      label('INCINERATOR', 0, -19.8, 2.6, 0, 8),
    ],
  },

  riverpit: {
    extent: [30, 30],
    spawn: [
      [-18, 0, 14],
      [9, 0, -14],
    ],
    elevation: 4,
    reference: 'Roshan · classic river pit (Dota 2)',
    fidelity: 'Classic river-side pit · bilateral fog adaptation',
    description:
      'A single pit mouth opens onto the river. The surrounding banks rise above it, and opponents disappear across the pit’s fog boundary in both directions.',
    blocks: [
      b(1, -15, 4, 24, 7, 'cliff'),
      b(13, -27, 26, 4, 7, 'cliff'),
      b(26, -13, 4, 24, 7, 'cliff'),
      b(21, 0, 12, 4, 7, 'cliff'),
      b(4, 0, 8, 4, 7, 'cliff'),
      b(-21, -15, 14, 22, 4, 'bank'),
      b(-22, 23, 14, 12, 4, 'bank'),
      b(17, 23, 24, 10, 4, 'bank'),
      ...stairs(-11, -17, 5, 14, 0, 4, 'x', -1),
      ...stairs(-11, 23, 5, 12, 0, 4, 'x', -1),
      ...stairs(17, 12, 5, 10, 0, 4, 'z', 1),
      b(-2, 12, 3, 3, 1.2, 'rock'),
      b(-18, 5, 2, 2, 2, 'tree'),
    ],
    sightZones: [{ x: 13, z: -13, w: 23, d: 28 }],
    water: [{ x: -5, z: 0, w: 8, d: 58 }],
    labels: [
      label('ROSHAN', 13, -24.8, 3, 0, 9),
      label('RIVER', -5, 28, 2, Math.PI),
      label('HIGH GROUND', -22, -25, 5),
    ],
    fogGate: { x: 11.5, z: 2, w: 7, h: 7 },
  },

  depot: {
    extent: [30, 38],
    spawn: [
      [-14, 0, 25],
      [14, 0, -23],
    ],
    elevation: 5,
    reference: 'Shibuya Terminal · Jet Set Radio Future',
    fidelity: 'Terminal plaza crop · ramps adapted for FPS',
    description:
      'An open bus plaza, raised shelter roofs, an elevated perimeter route, and the five branching street approaches replace the parallel-lane blockout.',
    blocks: [
      b(-9, 8, 3, 10, 2.7, 'bus'),
      b(8, 9, 3, 10, 2.7, 'bus'),
      b(-9, -6, 3, 10, 2.7, 'bus'),
      b(8, -6, 3, 10, 2.7, 'bus'),
      deck(-3, 7, 3, 23, 3.2, 'shelter'),
      deck(14, 4, 3, 23, 3.2, 'shelter'),
      b(2, 25, 5, 5, 3, 'kiosk'),
      deck(-25, -8, 5, 35, 5, 'overpass'),
      deck(0, -28, 50, 5, 5, 'overpass'),
      deck(25, -8, 5, 35, 5, 'overpass'),
      ...stairs(-25, 18, 5, 17, 0, 5, 'z', -1),
      ...stairs(25, 18, 5, 17, 0, 5, 'z', -1),
      ...stairs(-3, 24, 3, 11, 0, 3.2, 'z', -1),
      ...stairs(14, -13, 3, 11, 0, 3.2, 'z', 1),
      b(-16, -33, 9, 8, 10, 'building'),
      b(17, -33, 9, 8, 10, 'building'),
      b(-26, 32, 7, 10, 8, 'building'),
      b(26, 32, 7, 10, 8, 'building'),
    ],
    labels: [
      label('SHIBUYA TERMINAL', 0, -30.6, 7, 0, 18),
      label('DOGENZAKA HILL', 20, -36, 3),
      label('CHUO ST ↑', -25, -19, 6),
      label('CHUO ST ↓', -25, 2, 6),
      label('GARAGE', 29, 10, 3, -Math.PI / 2),
      label('HIKAGE ST', -15, 36, 3, Math.PI),
    ],
  },
};

// In the inspected Afghan plan the cockpit points east, toward the bunker.
for (const piece of LAYOUTS.airframe.blocks) {
  if (
    ['wreck', 'cockpit', 'tail', 'wing'].includes(piece.kind) ||
    (piece.kind === 'step' && Math.abs(piece.x) < 12 && Math.abs(piece.z) < 12)
  ) {
    const oldX = piece.x;
    piece.x = -piece.z;
    piece.z = oldX;
    piece.yaw -= Math.PI / 2;
  }
}
