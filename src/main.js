import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-800.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import './style.css';
import { MAPS, getMap } from './maps.js';
import { createMatch, stepMatch, createBot, botInput, movePlayer, RULES } from './simulation.js';
import { World } from './renderer.js';
import { Audio } from './audio.js';

const app = document.querySelector('#app'),
  canvas = document.querySelector('#game');
let world;
try {
  world = new World(canvas);
} catch (error) {
  app.innerHTML =
    '<div class="fatal"><h1>WebGL is required.</h1><p>Open this game in a desktop browser with hardware acceleration enabled.</p></div>';
  throw error;
}
const audio = new Audio();
const saved = (() => {
  try {
    return JSON.parse(localStorage.getItem('elephant-settings') || '{}');
  } catch {
    return {};
  }
})();
const settings = {
  sensitivity: Math.max(0.3, Math.min(3, Number(saved.sensitivity) || 1)),
  fov: Math.max(65, Math.min(110, Number(saved.fov) || 84)),
  volume: Number.isFinite(saved.volume) ? Math.max(0, Math.min(1, saved.volume)) : 0.5,
  difficulty: saved.difficulty || 'normal',
};
audio.volume = settings.volume;
let selected = 'airframe',
  mode = 'ai',
  rotate = false,
  screen = 'menu',
  match = null,
  bot = createBot(),
  localId = 0,
  lastEvent = 0,
  lastRound = 0,
  socket = null,
  roomCode = '',
  network = false,
  latency = 0,
  accumulator = 0,
  lastTime = performance.now(),
  sendTime = 0,
  hudTime = 0,
  hitUntil = 0,
  damageUntil = 0,
  queuedCode = new URLSearchParams(location.search).get('room') || '';
let heldFire = false,
  pendingFire = false;
const keys = new Set(),
  input = {
    yaw: 0,
    pitch: 0,
    forward: 0,
    side: 0,
    jump: false,
    sprint: false,
    fire: false,
    reload: false,
    aim: false,
  };
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const iconArrow = '<span aria-hidden="true">↗</span>';
function miniMap(m) {
  const size = m.size * 2;
  return `<svg viewBox="0 0 ${size} ${size}" aria-hidden="true"><rect x=".5" y=".5" width="${size - 1}" height="${size - 1}" fill="none" stroke="currentColor" stroke-width=".5"/>${m.blocks.map((b) => `<rect x="${b.x - b.w / 2 + m.size}" y="${b.z - b.d / 2 + m.size}" width="${b.w}" height="${b.d}" fill="currentColor"/>`).join('')}<circle cx="${m.spawn[0][0] + m.size}" cy="${m.spawn[0][2] + m.size}" r="1.7" fill="#e6f284"/><circle cx="${m.spawn[1][0] + m.size}" cy="${m.spawn[1][2] + m.size}" r="1.7" fill="#ed987f"/></svg>`;
}
function topbar() {
  return '<header class="topbar"><a class="brand" href="/" aria-label="Elephant Duel Club home"><span class="brand-mark">E<span>•</span></span><span>ELEPHANT<br><small>DUEL CLUB</small></span></a><div class="build-tag"><i></i> PROTOTYPE 001 <span> / </span> DESKTOP FPS</div><button class="quiet" id="settings">SETTINGS <span>⚙</span></button></header>';
}
function wireSettings() {
  document.querySelector('#settings')?.addEventListener('click', showSettings);
}
function showMenu() {
  screen = 'menu';
  match = null;
  network = false;
  lastEvent = 0;
  keys.clear();
  world.load(selected);
  app.className = 'menu';
  const m = getMap(selected);
  app.innerHTML = `${topbar()}<main class="launch"><section class="intro"><div class="eyebrow"><span class="line"></span> TWO PLAYERS. NO SECOND CHANCES.</div><h1>BIG GUN.<br>SMALL <span>WORLD.</span></h1><p class="lead">A little arena. An elephant rifle.<br>Settle it in thirty seconds.</p><div class="rules"><span><b>01</b> SHOT TO KILL</span><span><b>02</b> IN THE CHAMBER</span><span><b>07</b> ROUNDS TO WIN</span></div><div class="play-panel"><div class="mode-toggle" role="group" aria-label="Opponent"><button data-mode="ai" class="${mode === 'ai' ? 'active' : ''}">SOLO VS AI</button><button data-mode="friend" class="${mode === 'friend' ? 'active' : ''}">1V1 WITH A FRIEND ${iconArrow}</button></div><div class="match-options"><label>${mode === 'ai' ? 'OPPONENT' : 'CONNECTION'}${mode === 'ai' ? `<select id="difficulty" aria-label="AI difficulty"><option value="easy">Easy / warm up</option><option value="normal">Normal / keep moving</option><option value="hard">Hard / good luck</option></select>` : '<span class="option-value">Private room · 2 players</span>'}</label><label class="rotation"><input type="checkbox" id="rotate" ${rotate ? 'checked' : ''}> ROTATE ARENAS</label></div><button class="primary" id="play">${mode === 'ai' ? 'ENTER THE ARENA' : 'PLAY WITH A FRIEND'} ${iconArrow}</button><div class="play-foot"><span class="dot"></span>${mode === 'ai' ? 'NO SIGN-UP. JUST ONE MORE ROUND.' : 'CREATE A ROOM. SEND A CODE. SETTLE IT.'}</div></div></section><aside class="scene-caption"><span class="coordinate">${String(MAPS.indexOf(m) + 1).padStart(2, '0')} / 10 &nbsp; • &nbsp; LIVE ARENA PREVIEW</span><h2>${m.name}</h2><p>${m.description}</p><div class="scene-tags"><span>${m.tag.split(' / ')[0]}</span><span>1V1</span><span>30 SEC</span></div></aside></main><section class="arena-library"><div class="library-heading"><h3>CHOOSE YOUR GROUND <span>10 ARENAS</span></h3><span>SMALL MAPS. BIG CONSEQUENCES.</span></div><div class="arena-list">${MAPS.map((a, i) => `<button class="arena-card ${a.id === selected ? 'selected' : ''}" data-map="${a.id}" aria-pressed="${a.id === selected}"><div class="map-top"><span>${String(i + 1).padStart(2, '0')}</span>${a.id === selected ? '<i></i>' : ''}</div>${miniMap(a)}<strong>${a.name}</strong><small>${a.tag.split(' / ')[0]}</small></button>`).join('')}</div></section><footer class="footer"><span>MOVE <kbd>W A S D</kbd> &nbsp; AIM <kbd>MOUSE</kbd> &nbsp; SHOOT <kbd>LMB</kbd> &nbsp; JUMP <kbd>SPACE</kbd></span><span>LESS WAITING. MORE DUELLING. <b>↗</b></span></footer>`;
  document.querySelectorAll('[data-map]').forEach(
    (el) =>
      (el.onclick = () => {
        selected = el.dataset.map;
        showMenu();
      }),
  );
  document.querySelectorAll('[data-mode]').forEach(
    (el) =>
      (el.onclick = () => {
        mode = el.dataset.mode;
        showMenu();
      }),
  );
  document.querySelector('#rotate').onchange = (e) => (rotate = e.target.checked);
  const difficulty = document.querySelector('#difficulty');
  if (difficulty) {
    difficulty.value = settings.difficulty;
    difficulty.onchange = (e) => {
      settings.difficulty = e.target.value;
      saveSettings();
    };
  }
  document.querySelector('#play').onclick = () => (mode === 'ai' ? startSolo() : showFriends());
  wireSettings();
}
function saveSettings() {
  try {
    localStorage.setItem('elephant-settings', JSON.stringify(settings));
  } catch {}
  audio.volume = settings.volume;
}
function showSettings() {
  const returnScreen = screen;
  screen = 'settings';
  const overlay = document.createElement('div');
  overlay.className = 'modal-shade';
  overlay.innerHTML = `<section class="modal"><div class="eyebrow">MAKE YOURSELF AT HOME</div><h2>Fine tuning.</h2><label class="slider-label">MOUSE SENSITIVITY <output id="sensitivity-value">${settings.sensitivity.toFixed(1)}</output><input id="sensitivity" type="range" min=".3" max="3" step=".1" value="${settings.sensitivity}"></label><label class="slider-label">FIELD OF VIEW <output id="fov-value">${settings.fov}°</output><input id="fov" type="range" min="65" max="110" step="1" value="${settings.fov}"></label><label class="slider-label">VOLUME <output id="volume-value">${Math.round(settings.volume * 100)}%</output><input id="volume" type="range" min="0" max="1" step=".05" value="${settings.volume}"></label><div class="controls-grid"><span>Move / Sprint</span><b>WASD / SHIFT</b><span>Jump / Reload</span><b>SPACE / R</b><span>Fire / Focus aim</span><b>LEFT / RIGHT MOUSE</b><span>Pause / Release mouse</span><b>ESC</b></div><button class="primary" id="done-settings">LOOKS GOOD ${iconArrow}</button></section>`;
  app.append(overlay);
  for (const key of ['sensitivity', 'fov', 'volume'])
    document.querySelector('#' + key).oninput = (e) => {
      settings[key] = Number(e.target.value);
      document.querySelector('#' + key + '-value').textContent =
        key === 'volume'
          ? Math.round(settings[key] * 100) + '%'
          : key === 'fov'
            ? settings[key] + '°'
            : settings[key].toFixed(1);
      saveSettings();
    };
  document.querySelector('#done-settings').onclick = () => {
    overlay.remove();
    screen = returnScreen;
  };
}
function showFriends() {
  screen = 'friends';
  app.className = 'menu';
  app.innerHTML = `${topbar()}<div class="modal-shade friends-shade"><section class="modal wide"><div class="eyebrow">GOOD FRIENDS. BAD INTENTIONS.</div><h2>Make it personal.</h2><p class="muted">Both players need this game open on the same server. Create a room, then share its six-character code.</p><div class="friend-columns"><div><h3>Start something.</h3><p>${esc(getMap(selected).name)} · First to 7</p><button class="primary" id="create">CREATE ROOM ${iconArrow}</button></div><form id="join-form"><h3>Finish something.</h3><label class="sr-only" for="room-input">Room code</label><input class="text-input" id="room-input" placeholder="ROOM CODE" value="${esc(queuedCode)}" maxlength="6" autocomplete="off" required pattern="[a-fA-F0-9]{6}"><button class="secondary" type="submit">JOIN ROOM ${iconArrow}</button></form></div><p id="connection-status" role="status" class="status-text">Local play: start the Node server with npm start.</p><button class="quiet" id="back">← BACK TO THE CLUB</button></section></div>`;
  document.querySelector('#create').onclick = () =>
    connect({ type: 'create', mapId: selected, rotate });
  document.querySelector('#join-form').onsubmit = (e) => {
    e.preventDefault();
    connect({ type: 'join', code: document.querySelector('#room-input').value });
  };
  document.querySelector('#back').onclick = () => {
    disconnect();
    showMenu();
  };
  wireSettings();
}
function connect(message) {
  disconnect();
  const status = document.querySelector('#connection-status');
  status.textContent = 'Connecting to the duel server…';
  const ws = new WebSocket(
    `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/socket`,
  );
  socket = ws;
  const timeout = setTimeout(() => {
    if (ws.readyState !== WebSocket.OPEN) {
      ws.close();
      if (status.isConnected)
        status.textContent = 'Connection timed out. Start the game server and try again.';
    }
  }, 7000);
  ws.onopen = () => {
    clearTimeout(timeout);
    ws.send(JSON.stringify(message));
  };
  ws.onerror = () => {
    if (status.isConnected)
      status.textContent =
        'Server unavailable. Run npm run build, then npm start, and open http://localhost:3001.';
  };
  ws.onclose = () => {
    clearTimeout(timeout);
    if (socket === ws) {
      socket = null;
      if (network) {
        network = false;
        match = null;
        showNotice(
          'Connection lost.',
          'The duel server disconnected. Rejoin from the friend menu.',
        );
      }
    }
  };
  ws.onmessage = (e) => {
    let msg;
    try {
      msg = JSON.parse(e.data);
    } catch {
      return;
    }
    if (msg.type === 'error') {
      if (status.isConnected) status.textContent = msg.message;
    }
    if (msg.type === 'room') {
      roomCode = msg.code;
      screen = 'lobby';
      app.innerHTML = `${topbar()}<div class="modal-shade friends-shade"><section class="modal"><div class="eyebrow"><span class="dot"></span> WAITING FOR YOUR OPPONENT</div><h2>You're on.</h2><p class="muted">Send your friend this room code.</p><div class="room-code">${roomCode}</div><button class="primary" id="copy">COPY INVITE LINK ${iconArrow}</button><p class="muted small">For LAN play, share your computer’s network address. Internet play requires a publicly hosted server.</p><p id="copy-status" role="status"></p><button class="quiet" id="cancel">CANCEL ROOM</button></section></div>`;
      document.querySelector('#copy').onclick = async () => {
        const url = new URL(location.href);
        url.searchParams.set('room', roomCode);
        try {
          await navigator.clipboard.writeText(url.href);
          document.querySelector('#copy-status').textContent = 'Invite link copied.';
        } catch {
          document.querySelector('#copy-status').textContent = url.href;
        }
      };
      document.querySelector('#cancel').onclick = () => {
        disconnect();
        showMenu();
      };
      wireSettings();
    }
    if (msg.type === 'start') {
      network = true;
      localId = msg.slot;
      roomCode = msg.code;
      match = msg.match;
      lastEvent = 0;
      lastRound = 0;
      syncMatch();
      screen = 'pause';
      showPause('Opponent connected.', 'Click below to grab your mouse and enter the arena.');
    }
    if (msg.type === 'state' && network) {
      match = msg.match;
      syncMatch();
    }
    if (msg.type === 'left') {
      disconnect();
      match = null;
      showNotice('The arena is quiet.', msg.message);
    }
    if (msg.type === 'pong') latency = Math.round(performance.now() - msg.at);
    if (msg.type === 'rematch') {
      const b = document.querySelector('#rematch');
      if (b) b.textContent = `WAITING FOR OPPONENT · ${msg.count}/2 READY`;
    }
  };
}
function disconnect() {
  if (socket) {
    const ws = socket;
    socket = null;
    ws.onclose = null;
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'leave' }));
    ws.close();
  }
  network = false;
}
function showNotice(title, message) {
  screen = 'notice';
  document.exitPointerLock?.();
  app.className = 'menu';
  app.innerHTML = `<div class="modal-shade"><section class="modal"><h2>${esc(title)}</h2><p class="muted">${esc(message)}</p><button class="primary" id="notice-back">BACK TO THE CLUB ${iconArrow}</button></section></div>`;
  document.querySelector('#notice-back').onclick = showMenu;
}
function syncMatch() {
  if (world.map.id !== match.mapId) world.load(match.mapId);
  if (lastRound !== match.round) {
    lastRound = match.round;
    const p = match.players[localId];
    input.yaw = p.yaw;
    input.pitch = p.pitch;
    input.fire = false;
  }
  for (const ev of match.events) {
    if (ev.id <= lastEvent) continue;
    lastEvent = ev.id;
    if (ev.type === 'shot') {
      world.shot(ev, localId);
      audio.shot(ev.player === localId);
      if (ev.hit) {
        if (ev.player === localId) {
          hitUntil = performance.now() + 220;
          audio.hit();
        } else damageUntil = performance.now() + 500;
      }
    }
    if (ev.type === 'reload' && ev.player === localId) audio.reload();
  }
  if (match.phase === 'finished' && screen === 'game') showResults();
}
function startSolo() {
  disconnect();
  localId = 0;
  match = createMatch(selected, rotate);
  bot = createBot();
  lastRound = 0;
  lastEvent = 0;
  accumulator = 0;
  syncMatch();
  enterGame();
}
function renderHUD() {
  app.className = 'playing';
  app.innerHTML = `<div class="hud"><div class="hud-top"><div class="hud-brand">E<span>•</span><small id="hud-map"></small></div><div class="scoreboard"><span class="score-you" id="score-you">0</span><div><small>FIRST TO 7</small><b id="round-clock">00:30</b></div><span class="score-enemy" id="score-enemy">0</span></div><div class="hud-connection" id="hud-connection"></div></div><div id="crosshair"><i></i><i></i><i></i><i></i></div><div id="hitmarker">×</div><div id="round-banner"></div><div class="hud-bottom"><div class="alive-label"><span class="dot"></span><b id="life-state">ONE SHOT. MAKE IT COUNT.</b><small>WASD MOVE &nbsp; SHIFT SPRINT &nbsp; SPACE JUMP</small></div><div class="weapon-hud"><small>.700 NITRO EXPRESS</small><b>ELEPHANT <span id="ammo">02 <em>/ 02</em></span></b><div id="reload-track"><i></i></div><small id="reload-label">R RELOAD &nbsp; · &nbsp; RMB FOCUS</small></div></div><div id="damage"></div><div class="esc-hint">ESC TO PAUSE</div></div>`;
}
function enterGame() {
  screen = 'game';
  keys.clear();
  input.fire = false;
  heldFire = false;
  pendingFire = false;
  audio.unlock();
  renderHUD();
  const request = canvas.requestPointerLock();
  request?.catch(() => {
    if (screen === 'game')
      showPause('Click to enter.', 'Your browser needs a click to capture the mouse.');
  });
}
function showPause(
  title = 'Take a breath.',
  sub = network ? 'The online match continues while paused.' : 'The arena will be right here.',
) {
  if (!match) return;
  screen = 'pause';
  keys.clear();
  input.fire = false;
  input.forward = input.side = 0;
  document.exitPointerLock?.();
  app.className = 'playing';
  app.innerHTML = `<div class="modal-shade"><section class="modal"><div class="eyebrow">ELEPHANT / DUEL CLUB</div><h2>${title}</h2><p class="muted">${sub}</p><button class="primary" id="resume">ENTER THE ARENA ${iconArrow}</button><button class="secondary" id="settings">SETTINGS</button><button class="quiet" id="quit">LEAVE MATCH</button></section></div>`;
  document.querySelector('#resume').onclick = () => {
    if (match.phase === 'finished') showResults();
    else enterGame();
  };
  document.querySelector('#quit').onclick = () => {
    disconnect();
    showMenu();
  };
  wireSettings();
}
function showResults() {
  screen = 'results';
  document.exitPointerLock?.();
  input.fire = false;
  keys.clear();
  const p = match.players[localId],
    o = match.players[1 - localId],
    won = p.score > o.score;
  app.className = 'playing';
  app.innerHTML = `<div class="modal-shade"><section class="modal result-modal"><div class="eyebrow">${won ? 'A VERY LOUD VICTORY.' : 'THERE’S ALWAYS THE NEXT ROUND.'}</div><h2>${won ? 'Big shot.' : 'Outgunned.'}</h2><div class="result-score">${p.score}<span>:</span>${o.score}</div><div class="result-stats"><span>ROUNDS<b>${match.round}</b></span><span>SHOTS FIRED<b>${p.shots}</b></span><span>ACCURACY<b>${p.shots ? Math.round((p.kills / p.shots) * 100) : 0}%</b></span></div><button class="primary" id="rematch">ONE MORE MATCH ${iconArrow}</button><button class="quiet" id="quit">BACK TO THE CLUB</button></section></div>`;
  document.querySelector('#rematch').onclick = () => {
    if (network && socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'rematch' }));
      document.querySelector('#rematch').disabled = true;
    } else startSolo();
  };
  document.querySelector('#quit').onclick = () => {
    disconnect();
    showMenu();
  };
}
function updateHUD(now) {
  if (screen !== 'game' || !match) return;
  const p = match.players[localId];
  document.querySelector('#hud-map').textContent = getMap(match.mapId).name.toUpperCase();
  document.querySelector('#score-you').textContent = p.score;
  document.querySelector('#score-enemy').textContent = match.players[1 - localId].score;
  document.querySelector('#round-clock').textContent =
    '00:' +
    String(Math.max(0, Math.ceil(match.phase === 'live' ? match.timer : 30))).padStart(2, '0');
  document.querySelector('#hud-connection').textContent = network
    ? `ROOM ${roomCode} · ${latency} MS`
    : `SOLO · ${settings.difficulty.toUpperCase()} AI`;
  document.querySelector('#ammo').innerHTML = `0${p.ammo} <em>/ 02</em>`;
  document.querySelector('#reload-track i').style.width =
    (p.reload > 0 ? (1 - p.reload / RULES.reload) * 100 : 100) + '%';
  document.querySelector('#reload-label').textContent =
    p.reload > 0
      ? 'RELOADING…'
      : p.ammo === 0
        ? 'EMPTY · PRESS R TO RELOAD'
        : 'R RELOAD · RMB FOCUS';
  document.querySelector('#life-state').textContent = p.alive
    ? 'ONE SHOT. MAKE IT COUNT.'
    : 'YOU’LL BE RIGHT BACK.';
  document.querySelector('#hitmarker').style.opacity = now < hitUntil ? '1' : '0';
  document.querySelector('#damage').style.opacity = now < damageUntil ? '.65' : '0';
  document.querySelector('#crosshair').style.opacity =
    match.phase === 'live' && p.alive ? '1' : '.25';
  const banner = document.querySelector('#round-banner');
  if (match.phase === 'countdown')
    banner.innerHTML = `<small>ROUND ${match.round} / ${getMap(match.mapId).name.toUpperCase()}</small><b>${Math.max(1, Math.ceil(match.timer))}</b>`;
  else if (match.phase === 'intermission')
    banner.innerHTML = `<small>${match.winner === null ? 'NO SHOT LANDED' : match.winner === localId ? 'CLEAN SHOT.' : 'BACK IN A SECOND.'}</small><b>${match.winner === null ? 'DRAW' : match.winner === localId ? 'ROUND WON' : 'ROUND LOST'}</b><span>NEXT ROUND IN ${Math.ceil(match.timer)}</span>`;
  else banner.innerHTML = '';
}
addEventListener('keydown', (e) => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  if (screen === 'game' && ['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code))
    e.preventDefault();
  keys.add(e.code);
  if (e.code === 'Escape' && screen === 'game') showPause();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => {
  keys.clear();
  input.fire = false;
  if (screen === 'game') showPause();
});
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== canvas && screen === 'game') showPause();
});
document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== canvas || screen !== 'game') return;
  input.yaw -= e.movementX * 0.0018 * settings.sensitivity;
  input.pitch = Math.max(
    -1.45,
    Math.min(1.45, input.pitch - e.movementY * 0.0018 * settings.sensitivity),
  );
});
canvas.addEventListener('mousedown', (e) => {
  if (screen !== 'game') return;
  if (e.button === 0) {
    heldFire = true;
    pendingFire = true;
  }
  if (e.button === 2) input.aim = true;
});
addEventListener('mouseup', (e) => {
  if (e.button === 0) heldFire = false;
  if (e.button === 2) input.aim = false;
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  const active = screen === 'game' && document.pointerLockElement === canvas;
  input.forward = active ? (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0) : 0;
  input.side = active ? (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0) : 0;
  input.jump = active && keys.has('Space');
  input.sprint = active && keys.has('ShiftLeft');
  input.reload = active && keys.has('KeyR');
  input.fire = active && (heldFire || pendingFire);
  if (!active) {
    heldFire = false;
    pendingFire = false;
  }
  if (match && !network && active) {
    accumulator += dt;
    while (accumulator >= 1 / 60) {
      stepMatch(match, [input, botInput(match, bot, 1 / 60, settings.difficulty)], 1 / 60);
      accumulator -= 1 / 60;
      pendingFire = false;
      input.fire = heldFire;
    }
    syncMatch();
  }
  if (match && network) {
    if (active && match.phase === 'live' && match.players[localId].alive)
      movePlayer(match.players[localId], input, getMap(match.mapId), dt);
    sendTime += dt;
    if (sendTime > 1 / 60 && socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'input', input }));
      pendingFire = false;
      sendTime = 0;
    }
    if (
      Math.floor(now / 2000) !== Math.floor((now - dt * 1000) / 2000) &&
      socket?.readyState === WebSocket.OPEN
    )
      socket.send(JSON.stringify({ type: 'ping', at: now }));
  }
  world.render(dt, match, localId, input, settings);
  hudTime += dt;
  if (hudTime > 0.04) {
    updateHUD(now);
    hudTime = 0;
  }
  requestAnimationFrame(frame);
}
showMenu();
if (queuedCode) {
  mode = 'friend';
  showFriends();
}
requestAnimationFrame(frame);
