import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { once } from 'node:events';
import { createGameServer } from '../server.js';
import { MAPS } from '../src/maps.js';

const server = createGameServer({ port: 0, host: '127.0.0.1' });
await once(server.server, 'listening');
const url = `http://127.0.0.1:${server.server.address().port}`;
let browser;
try {
  await mkdir('test-results', { recursive: true });
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.BROWSER_EXECUTABLE || undefined,
    args: ['--enable-unsafe-swiftshader'],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage(),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'test-results/menu.png' });
  for (const map of MAPS) {
    await page.locator(`[data-map="${map.id}"]`).click();
    await page.waitForTimeout(100);
    assert.equal(await page.locator('.scene-caption h2').textContent(), map.name);
  }
  await page.locator('[data-map="airframe"]').click();
  await page.locator('#play').click();
  await page.waitForFunction(() => document.pointerLockElement !== null);
  await page.waitForFunction(() => document.querySelector('#round-banner')?.textContent === '');
  // A click shorter than a frame must still consume a cartridge.
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForFunction(() => document.querySelector('#ammo')?.textContent.startsWith('01'));
  await page.screenshot({ path: 'test-results/gameplay.png' });
  await page.keyboard.down('KeyR');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyR');
  await page.waitForFunction(() => document.querySelector('#ammo')?.textContent.startsWith('02'));
  await page.evaluate(() => document.exitPointerLock());
  await page.locator('#settings').click();
  await page.locator('#fov').evaluate((element) => {
    element.value = '95';
  });
  await page.locator('#fov').dispatchEvent('input');
  await page.locator('#done-settings').click();
  await page.locator('#quit').click();
  assert.equal(
    await page.evaluate(() => JSON.parse(localStorage.getItem('elephant-settings')).fov),
    95,
  );
  await page.locator('[data-mode="friend"]').click();
  await page.locator('#play').click();
  await page.locator('#create').click();
  await page.locator('.room-code').waitFor();
  const code = await page.locator('.room-code').innerText();
  const friend = await context.newPage();
  friend.on('pageerror', (e) => errors.push(e.message));
  await friend.goto(`${url}/?room=${code}`);
  await friend.locator('#join-form button').click();
  await friend.locator('#resume').waitFor();
  await page.locator('#resume').waitFor();
  await friend.locator('#resume').click();
  await friend.waitForFunction(() =>
    document.querySelector('#hud-connection')?.textContent.includes('ROOM'),
  );
  assert.ok((await friend.locator('#hud-connection').textContent()).includes(code));
  await friend.close();
  await page.getByRole('heading', { name: 'The arena is quiet.' }).waitFor();
  await page.locator('#notice-back').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/narrow-menu.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
  console.log(
    'Browser smoke passed: ten arenas, pointer lock, quick fire, reload, settings, two-player room, disconnect, narrow layout.',
  );
} finally {
  await browser?.close();
  await server.close();
}
