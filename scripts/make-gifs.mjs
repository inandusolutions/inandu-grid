// Turns the Playwright promo recordings (--project=promo) into optimised GIFs in docs/gifs/.
//
//   npm run gifs          # record + convert
//   npm run gifs:record   # record only
//   node scripts/make-gifs.mjs   # convert only, from the last recording
//
// Playwright writes each scene's video to test-results/<...>-<scene>-promo/video.webm.
// This maps those back to scene names and converts with gifski (preferred) or ffmpeg.

import { readdir, stat, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const resultsDir = join(root, 'test-results');
const outDir = join(root, 'docs', 'gifs');

const FPS = 16;
const WIDTH = 1000;           // scenes record at 1280; downscale for size
const SOFT_LIMIT_KB = 3072;   // GitHub/npm render GIFs inline up to a few MB

if (!existsSync(resultsDir)) {
  console.error(`No ${resultsDir} — run "npm run gifs:record" first (or "npm run gifs" for both).`);
  process.exit(1);
}

const has = (cmd) => {
  try { return spawnSync(cmd, ['--version'], { stdio: 'ignore' }).status === 0; }
  catch { return false; }
};
const useGifski = has('gifski');
const useFfmpeg = !useGifski && has('ffmpeg');
if (!useGifski && !useFfmpeg) {
  console.error(
    'Need gifski (preferred) or ffmpeg on PATH.\n' +
    '  gifski:  cargo install gifski  |  scoop install gifski  |  brew install gifski\n' +
    '  ffmpeg:  https://ffmpeg.org/download.html',
  );
  process.exit(1);
}

// test-results/<sanitized-file>-<scene>-promo/video.webm  ->  scene name
const dirs = (await readdir(resultsDir, { withFileTypes: true }))
  .filter((d) => d.isDirectory() && d.name.endsWith('-promo'))
  .map((d) => d.name);

if (dirs.length === 0) {
  console.error('No "*-promo" recording folders in test-results/ — did `playwright test --project=promo` run?');
  process.exit(1);
}

await mkdir(outDir, { recursive: true });
console.log(`Encoder: ${useGifski ? 'gifski' : 'ffmpeg'}   ${WIDTH}px @ ${FPS}fps\n`);

let largest = 0;
let made = 0;
for (const d of dirs.sort()) {
  const src = join(resultsDir, d, 'video.webm');
  if (!existsSync(src)) { console.log(`  (${d}: no video.webm, skipped)`); continue; }
  // strip the leading "<file>-" (e.g. "e2e-promo-scenes-") and the trailing "-promo"
  const scene = d.replace(/-promo$/, '').replace(/^.*?scenes-/, ''); // <file>-scenes-<title>-promo -> <title>
  const out = join(outDir, `${scene}.gif`);

  const run = useGifski
    ? spawnSync('gifski', ['--fps', String(FPS), '--width', String(WIDTH), '--quality', '90', '-o', out, src], { stdio: 'inherit' })
    : spawnSync('ffmpeg', [
        '-y', '-i', src,
        '-vf', `fps=${FPS},scale=${WIDTH}:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer`,
        '-loop', '0', out,
      ], { stdio: 'inherit' });
  if (run.status !== 0) { console.error(`\nEncoding failed for ${scene}`); process.exit(1); }

  const kb = Math.round((await stat(out)).size / 1024);
  largest = Math.max(largest, kb);
  made++;
  console.log(`  ${scene}.gif  ${kb} KB${kb > SOFT_LIMIT_KB ? '  ! over 3 MB — shorten the scene or drop WIDTH/FPS' : ''}`);
}

console.log(`\n${made} gif(s) in docs/gifs/  (largest ${largest} KB)`);
