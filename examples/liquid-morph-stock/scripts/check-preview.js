#!/usr/bin/env node
// Smoke test for the interactive preview: starts the Vite dev server, opens
// index.html in headless Chromium, fails on any console error / page error /
// shader error, and saves a screenshot to output/preview-check.png.
//   node scripts/check-preview.js [--gpu] [--chromium /path/to/chrome]

import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { ROOT, parseArgs } from './lib.js';

const args = parseArgs();
const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 0, host: '127.0.0.1' } });
await server.listen();
const { port } = server.httpServer.address();
console.log(`✔ Vite dev server started on http://127.0.0.1:${port}/`);

const browser = await chromium.launch({
  headless: true,
  executablePath: args.chromium || process.env.CHROMIUM_PATH || undefined,
  args: args.gpu
    ? ['--ignore-gpu-blocklist', '--use-angle=default']
    : ['--ignore-gpu-blocklist', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const problems = [];
page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
page.on('pageerror', (e) => problems.push(`page: ${e.message}`));
await page.goto(`http://127.0.0.1:${port}/`);
await page.waitForTimeout(4000);
const errBox = await page.$eval('#error', (el) => (el.hidden ? '' : el.textContent));
if (errBox) problems.push(`app: ${errBox}`);
const hud = await page.$eval('#hud', (el) => el.textContent);
fs.mkdirSync(path.join(ROOT, 'output'), { recursive: true });
await page.screenshot({ path: path.join(ROOT, 'output/preview-check.png') });
await browser.close();
await server.close();

if (problems.length) {
  console.error('✖ Preview reported errors:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`✔ No console or shader errors. HUD:\n  ${hud.replace(/\n/g, '\n  ')}`);
console.log('✔ Screenshot: output/preview-check.png');
