#!/usr/bin/env node
/**
 * Build one extension.
 *   pnpm build <slug>           dev build  -> extensions/<slug>/dist       (test key works)
 *   pnpm build <slug> --prod    store build -> extensions/<slug>/dist-prod (test key rejected, minified)
 *   pnpm dev <slug>             dev build + rebuild on change
 *
 * Each entry (content, popup, options, background) is bundled to a single IIFE
 * file, because MV3 content scripts can't be ES modules.
 */
import { build as viteBuild } from 'vite';
import { build as esbuild } from 'esbuild';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Shared packages resolve straight to their source. */
export const ALIASES = Object.fromEntries(['core', 'ui', 'job-sites', 'testing'].map((p) => [`@ext/${p}`, path.join(ROOT, `packages/${p}/src/index.ts`)]));

/** Skip macOS metadata files (._*) that some drives create. */
const keep = (src) => !path.basename(src).startsWith('._') && path.basename(src) !== '.DS_Store';

export async function loadExtension(slug) {
  const dir = path.join(ROOT, 'extensions', slug);
  if (!existsSync(dir)) throw new Error(`No extension "${slug}". Folders: ${(await readdir(path.join(ROOT, 'extensions'))).filter((d) => !d.startsWith('.')).join(', ')}`);
  const config = JSON.parse(await readFile(path.join(dir, 'extension.config.json'), 'utf8'));
  const pkg = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8'));
  return { dir, config, version: pkg.version };
}

async function loadTsModule(file, outDir) {
  const out = path.join(outDir, `.tmp-${path.basename(file, '.ts')}-${process.pid}.mjs`);
  await esbuild({ entryPoints: [file], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'silent', define: { __DEV__: 'false' }, alias: ALIASES });
  try { return await import(pathToFileURL(out).href + `?t=${Date.now()}`); } finally { await rm(out, { force: true }); }
}

export async function buildExtension(slug, { prod = false, watch = false } = {}) {
  const { dir, config, version } = await loadExtension(slug);
  const outDir = path.join(dir, prod ? 'dist-prod' : 'dist');
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  for (const [name, entry] of Object.entries(config.entries)) {
    await viteBuild({
      configFile: false,
      logLevel: 'warn',
      root: dir,
      define: { __DEV__: JSON.stringify(!prod) },
      resolve: { alias: ALIASES },
      build: {
        outDir,
        emptyOutDir: false,
        minify: prod,
        sourcemap: prod ? false : 'inline',
        target: 'chrome120',
        lib: { entry: path.join(dir, entry), formats: ['iife'], name: `x_${name}`, fileName: () => `${name}.js` },
        rollupOptions: { output: { extend: true } },
        watch: watch ? {} : null,
      },
    });
  }

  await cp(path.join(dir, 'public'), outDir, { recursive: true, filter: keep });
  await cp(path.join(ROOT, 'packages/ui/src/tokens.css'), path.join(outDir, 'tokens.css'));

  const { licenseHost } = await loadTsModule(path.join(ROOT, 'packages/core/src/license.ts'), outDir);
  const mod = await loadTsModule(path.join(dir, 'src/manifest.ts'), outDir);
  const manifest = mod.default({ version, dev: !prod, licenseHost: licenseHost(config.license) });
  await writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  for (const icon of Object.values(manifest.icons)) {
    if (!existsSync(path.join(outDir, icon))) console.warn(`⚠ Missing ${icon}. Run: pnpm assets ${slug}`);
  }
  console.log(`✓ Built ${slug} ${version} (${prod ? 'store' : 'dev'}) → ${path.relative(ROOT, outDir)}`);
  return { outDir, manifest, version, config, dir };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const slug = args.find((a) => !a.startsWith('--'));
  if (!slug) { console.error('Usage: pnpm build <slug> [--prod]   e.g. pnpm build workfromwhere'); process.exit(1); }
  buildExtension(slug, { prod: args.includes('--prod'), watch: args.includes('--watch') }).catch((e) => { console.error(e.message); process.exit(1); });
}
