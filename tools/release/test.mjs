#!/usr/bin/env node
/**
 * pnpm test [slug]
 * Unit tests (Vitest) for shared packages + the extension, then a fresh dev
 * build and the browser tests (Playwright) for that extension.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { ROOT, buildExtension } from './build.mjs';

const slug = process.argv[2];
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

const unitDirs = ['packages', 'tools'];
if (slug) unitDirs.push(`extensions/${slug}`);
else unitDirs.push('extensions');
run('npx', ['vitest', 'run', ...unitDirs]);

if (slug) {
  await buildExtension(slug, { prod: false });
  await buildExtension(slug, { prod: true });
  if (existsSync(path.join(ROOT, 'extensions', slug, 'e2e'))) run('npx', ['playwright', 'test', `extensions/${slug}/`]);
}
