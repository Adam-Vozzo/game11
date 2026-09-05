# Elephant Duel Club

A playable, fast-paced desktop FPS prototype. Two players, a double-barrel elephant rifle, compact arenas, and almost no downtime. Built for **Adam-Vozzo/game11**.

## Play

Requires **Node.js 22.12 or newer** and a desktop browser with WebGL enabled.

```sh
npm ci
npm run build
npm start
```

Open **http://localhost:3001**. Choose an arena and click **Enter the arena** for an AI duel. The mouse locks to the game when you enter; press Escape to release it.

### Friend matches

1. Both players open the game on the **same running Node server**.
2. Select **1v1 with a friend**, then **Create room**.
3. Share the six-character room code or use **Copy invite link**.
4. Your friend selects **Join room**. Both players click **Enter the arena**.

For two computers on the same network, use `http://HOST_LAN_IP:3001` on both computers, allow the Node server through the host's firewall, and share that address. `localhost` refers to each player's own computer, so a localhost invite will not work on another computer.

For internet play, deploy this repository to a Node host that supports WebSockets. Run `npm ci && npm run build` as the build command and `npm start` as the start command. Put HTTPS/WSS in front of it and route `/socket` to the same process. The server uses `PORT` (default `3001`) and exposes `/health`. A Dockerfile is included. Run **one instance**: rooms are in memory and are not shared across instances or preserved across restarts.

This repository does not automatically deploy or provision a paid service.

## Rules and controls

- One hit kills. Two rounds in the rifle; 0.48-second shot cooldown and 1.35-second reload.
- First to seven round wins. Each round lasts at most 30 seconds; a timeout is a draw.
- After a kill, a 1.6-second result beat and a 1-second countdown reset both players.
- Spawn sides swap each round. Optional arena rotation cycles through all ten arenas.
- AI has three difficulty settings and grid-based routing around cover.
- Hold fire for successive shots. Empty fire starts a reload, or press R to reload early.

| Action                | Control          |
| --------------------- | ---------------- |
| Move                  | W A S D          |
| Sprint                | Left Shift       |
| Jump                  | Space            |
| Aim                   | Mouse            |
| Fire                  | Left mouse       |
| Focus aim             | Hold right mouse |
| Reload                | R                |
| Pause / release mouse | Escape           |

Sensitivity, field of view, volume, and AI difficulty are saved in browser storage. Solo play pauses when the mouse is released or the window loses focus. **Online matches keep running while paused.** Both players must request a rematch after an online match finishes.

## Ten researched arena reconstructions

The arenas were reworked from online overhead maps and screenshots. They now follow the reference landmarks and routes more closely, with real stairs, upper floors, overhead passages, and height-aware AI navigation. **These are approximate reconstructions, not verified 1:1 maps.** See the [reference study](docs/map-research.md) for all ten sources, chosen versions, crop boundaries, and remaining differences. The menu's **Layout & reference** button opens an enlarged plan and fidelity notes.

| Arena             | Layout reference                      | Combat idea                                         |
| ----------------- | ------------------------------------- | --------------------------------------------------- |
| Airframe          | Afghan plane, MW2 (2009)              | Hollow aircraft, high cliff, cave and bunker        |
| Old Quarter       | Child-era Hyrule Market, OoT          | Perimeter shops, fountain, western back alley       |
| Last Train        | Operation Metro, BF3                  | Lower platforms, escalators and upper ticket hall   |
| Dead End          | Star Junction, GTA IV                 | Diagonal Burlesque / Denver–Exeter crossing         |
| After Hours       | School, THPS1                         | Gym roof, starting awning, ditch bridges, two pools |
| Saltwell          | Joppa, Caves of Qud                   | Fixed village arrangement and open huts             |
| Highrise          | No Mercy apartment starting roof, L4D | Skylight drops and stairwell return route           |
| Control Group     | GLaDOS chamber, Portal 1              | Circular platform, curved stairs, upper gallery     |
| The Pit           | Classic river Roshan pit, Dota 2      | Single entrance and bilateral visibility boundary   |
| Terminal Velocity | Shibuya Terminal, JSRF                | Open bus plaza, branching exits, raised routes      |

On The Pit, players on opposite sides of the pit boundary cannot see each other, and the AI cannot target across it. Blind fire can still hit. The dark entrance curtain marks the boundary. This is entity visibility rather than a full terrain fog-of-war system.

## Development

Run `npm start` in one terminal for the WebSocket server, and `npm run dev` in another for Vite's client dev server. Vite proxies `/socket` to port 3001. The production build serves both the client and WebSocket endpoint from the Node server.

```sh
npm test        # gameplay and two-client WebSocket integration tests
npm run build  # production client bundle
npm run check  # both
```

For the reproducible browser check, run `npx playwright install chromium` once, then `npm run test:browser` after building. It launches a temporary server and verifies all ten map selectors, pointer lock, fast clicks, reload, settings, two-player rooms, disconnect handling, and narrow-screen layout. Screenshots are written to `test-results/`. Set `BROWSER_EXECUTABLE` to use an existing Chrome executable instead of downloading Chromium.

Code guide:

- `src/simulation.js`: shared movement, collision, ray hits, ammunition, rounds, bot navigation.
- `src/maps.js`: arena metadata and themes.
- `src/layouts.js`: reference-based collision layouts, floors, spawns, and landmark labels.
- `src/geometry.js`: shared rotated boxes, stairs, rooms, and visibility zones.
- `src/arena-renderer.js`: procedural map scenery built from the collision layout.
- `src/renderer.js`: opponent, viewmodel, lights, and shot effects.
- `src/main.js`: menus, controls, local simulation, prediction, and networking.
- `src/audio.js`: synthesized rifle and feedback sounds.
- `server.js`: authoritative matches, private rooms, static files, and input validation.

The server simulates at 60 Hz and broadcasts at 20 Hz. The client predicts local movement and uses server snapshots for correction. The server controls hits, scores, ammunition, and player positions; clients send only movement/look/action inputs. Messages are size-limited and rate-limited, idle rooms expire, and disconnected opponents are notified.

## Prototype limits

This is a playable prototype with simplified geometry. It does not have matchmaking, accounts, ranked play, mobile controls, controllers, advanced animation, lag compensation, sophisticated anti-cheat, or persistent room storage. High-latency online movement can visibly correct. Terrain and round surfaces are assembled from boxes, and crop edges are blocked. AI navigation handles multiple floors but is still less capable than a human. Map distances and heights are estimated from images; several access routes were adapted for FPS movement. No original games' models, textures, music, logos, or audio are included.

Three.js supplies the rendering; Vite bundles the client; `ws` handles networking. Barlow Condensed and DM Sans are bundled through Fontsource under their included open font licenses. Everything required to play is served locally after installation and build.
