import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { once } from 'node:events';

// Deliberately no game server, WebSocket endpoint, or SPA fallback.
const root = path.resolve('dist-pages');
const prefix = '/game11/';
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (!pathname.startsWith(prefix)) throw new Error('Outside repository path');
    const file = path.resolve(root, pathname.slice(prefix.length) || 'index.html');
    if (!file.startsWith(root + path.sep)) throw new Error('Outside build');
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.BROWSER_EXECUTABLE || undefined,
    args: ['--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [],
    failed = [],
    sockets = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) failed.push(response.url());
  });
  page.on('requestfailed', (request) => failed.push(request.url()));
  page.on('websocket', (socket) => sockets.push(socket.url()));
  const url = `http://127.0.0.1:${server.address().port}${prefix}`;
  await page.goto(url + '?room=ABCDEF', { waitUntil: 'networkidle' });
  if (!process.env.VITE_MULTIPLAYER_URL) {
    assert.equal(await page.locator('[data-mode="friend"]').isDisabled(), true);
    assert.match(await page.locator('.play-foot').innerText(), /SOLO EDITION/);
  } else {
    // A configured Pages build accepts invites; solo still runs without a server.
    await page.locator('#back').click();
    await page.locator('[data-mode="ai"]').click();
  }
  assert.equal(await page.locator('[data-map]').count(), 10);
  for (const id of await page
    .locator('[data-map]')
    .evaluateAll((elements) => elements.map((e) => e.dataset.map))) {
    await page.locator(`[data-map="${id}"]`).click();
    assert.equal(await page.locator(`[data-map="${id}"]`).getAttribute('aria-pressed'), 'true');
  }
  await page.locator('.brand').click();
  assert.equal(new URL(page.url()).pathname, prefix);
  await page.reload({ waitUntil: 'networkidle' });
  const favicon = await page.locator('link[rel="icon"]').evaluate((el) => el.href);
  assert.equal(new URL(favicon).pathname, prefix + 'favicon.svg');
  assert.equal((await page.request.get(favicon)).status(), 200);
  await page.locator('#play').click();
  await page.waitForFunction(() => document.pointerLockElement !== null);
  await page.waitForFunction(() => document.querySelector('#round-banner')?.textContent === '');
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForFunction(() => document.querySelector('#ammo')?.textContent.startsWith('00'));
  await page.waitForFunction(() => document.querySelector('#ammo')?.textContent.startsWith('01'));
  await page.evaluate(() => document.exitPointerLock());
  await page.locator('#resume').waitFor();
  assert.deepEqual(sockets, []);
  assert.deepEqual(failed, []);
  assert.deepEqual(errors, []);
  console.log(
    'Pages smoke passed: repository subpath, all ten arenas, home link, reload, fonts/assets, pointer lock, railgun auto-recharge, pause, and no backend required.',
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
