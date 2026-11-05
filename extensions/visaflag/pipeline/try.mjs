#!/usr/bin/env node
/**
 * pnpm visaflag:try
 * For testing VisaFlag yourself before the data website exists:
 *  1. builds the real UK, Netherlands and Canada sponsor lists (and US if you've added the snapshot)
 *  2. makes a dev build of VisaFlag that reads them from http://localhost:4174
 *  3. serves them there until you press Ctrl+C
 * Then load extensions/visaflag/dist in chrome://extensions (Load unpacked).
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAll } from './build.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'out');
const PORT = 4174;
process.env.EXT_DATA_URL = `http://localhost:${PORT}`;

if (!process.argv.includes('--skip-data') || !existsSync(path.join(OUT, 'index.json'))) {
  console.log('Building sponsor lists from the official sources (about a minute)…');
  await buildAll({ out: OUT });
}
const { buildExtension } = await import('../../../tools/release/build.mjs');
await buildExtension('visaflag', { prod: false });

createServer(async (req, res) => {
  const file = path.join(OUT, path.basename(new URL(req.url, 'http://x').pathname));
  if (!existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'Content-Type': file.endsWith('.json') ? 'application/json' : 'application/gzip', 'Access-Control-Allow-Origin': '*' });
  res.end(await readFile(file));
}).listen(PORT, () => {
  console.log(`\n✓ VisaFlag test build: extensions/visaflag/dist (reads data from http://localhost:${PORT})`);
  console.log('  Load it in chrome://extensions → Load unpacked. Keep this running while you test. Ctrl+C to stop.');
});
