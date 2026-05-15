#!/usr/bin/env node
// ============================================================================
// Render Reel HTML/GSAP → MP4 9:16 (1080×1920) 30fps
// ============================================================================
// Lance puppeteer, ouvre index.html en mode capture (?capture=1), scrub la
// GSAP globalTimeline frame par frame, screenshot chaque frame, puis ffmpeg
// encode en MP4 H264.
//
// Usage : node render-mp4.mjs
// Sortie : ./out/reel-affiliation.mp4

import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Config
const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
const DURATION_SEC = 25;
const TOTAL_FRAMES = FPS * DURATION_SEC; // 750
const FRAMES_DIR = path.join(__dirname, 'out', 'frames');
const OUTPUT_MP4 = path.join(__dirname, 'out', 'reel-affiliation.mp4');
const FFMPEG = '/Users/vladimir/bin/ffmpeg';

await fs.mkdir(FRAMES_DIR, { recursive: true });

console.log(`▶ Lancement de Chrome headless (${WIDTH}×${HEIGHT})...`);
const browser = await puppeteer.launch({
  defaultViewport: { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 },
  args: [
    `--window-size=${WIDTH},${HEIGHT}`,
    '--hide-scrollbars',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
  ],
});

const page = await browser.newPage();
await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });

const url = `file://${path.join(__dirname, 'index.html')}?capture=1`;
console.log(`▶ Chargement ${url}`);
await page.goto(url, { waitUntil: 'networkidle0' });

// Attendre que les fonts Google chargent
await page.evaluate(() => document.fonts.ready);
// Attendre que le mode capture soit prêt
await page.waitForFunction(() => window.gsapReady === true, { timeout: 10000 });

console.log(`▶ Capture de ${TOTAL_FRAMES} frames à ${FPS} fps...`);
const t0 = Date.now();

for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
  const timeSec = frame / FPS;
  await page.evaluate((t) => window.gsapSeek(t), timeSec);
  // Petite pause pour laisser le navigateur peindre (rare nécessaire)
  // Sans ce nextTick, certains frames peuvent rendre avant le repaint
  await new Promise((r) => setTimeout(r, 5));
  const filename = path.join(FRAMES_DIR, `frame-${String(frame).padStart(4, '0')}.png`);
  await page.screenshot({
    path: filename,
    omitBackground: false,
    clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
  });
  if (frame % 30 === 0) {
    const pct = Math.round((frame / TOTAL_FRAMES) * 100);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`  ${pct.toString().padStart(3)}% · frame ${frame}/${TOTAL_FRAMES} · ${elapsed}s`);
  }
}

await browser.close();
const captureTime = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`✓ ${TOTAL_FRAMES} frames capturés en ${captureTime}s\n`);

console.log(`▶ Encodage MP4 H264 via ffmpeg...`);
const ffmpegArgs = [
  '-y',
  '-framerate', String(FPS),
  '-i', path.join(FRAMES_DIR, 'frame-%04d.png'),
  '-c:v', 'libx264',
  '-pix_fmt', 'yuv420p',
  '-preset', 'medium',
  '-crf', '18',
  // IG-friendly : keyframe toutes les 2s pour seek smooth
  '-g', String(FPS * 2),
  '-movflags', '+faststart',
  OUTPUT_MP4,
];

await new Promise((resolve, reject) => {
  const ff = spawn(FFMPEG, ffmpegArgs);
  ff.stderr.on('data', (d) => process.stderr.write(d));
  ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`))));
});

const stat = await fs.stat(OUTPUT_MP4);
console.log(`\n✓ MP4 généré : ${OUTPUT_MP4}`);
console.log(`  Taille : ${(stat.size / 1024 / 1024).toFixed(2)} MB`);

// Cleanup frames (optionnel — gardez si vous voulez les retoucher)
console.log(`\n▶ Nettoyage des frames PNG...`);
await fs.rm(FRAMES_DIR, { recursive: true, force: true });
console.log(`✓ Done`);
