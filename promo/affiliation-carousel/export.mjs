#!/usr/bin/env node
// ============================================================================
// Export carrousel Affiliation IG en 8 PNG (1080×1350)
// ============================================================================
// Usage : node export.mjs
// Sortie : ./out/slide-01.png à ./out/slide-08.png
//
// Dépend de Puppeteer. Si pas installé :
//   npm install -g puppeteer
// ou installe localement à la racine du repo :
//   bun add -d puppeteer  (depuis ~/Documents/GitHub/roadbook-ai)

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SLIDES_DIR = path.join(__dirname, 'slides');
const OUT_DIR = path.join(__dirname, 'out');

await fs.mkdir(OUT_DIR, { recursive: true });

const slides = ['01','02','03','04','05','06','07','08'];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1080, height: 1350 },
  deviceScaleFactor: 2, // retina-quality
});

for (const n of slides) {
  const page = await ctx.newPage();
  const filePath = `file://${path.join(SLIDES_DIR, `${n}.html`)}`;
  await page.goto(filePath, { waitUntil: 'networkidle' });
  // Attend que les fonts Google soient chargées
  await page.evaluate(() => document.fonts.ready);
  const out = path.join(OUT_DIR, `slide-${n}.png`);
  await page.screenshot({
    path: out,
    omitBackground: false,
    clip: { x: 0, y: 0, width: 1080, height: 1350 },
  });
  console.log(`✓ ${out}`);
  await page.close();
}

await browser.close();
console.log(`\n✓ Done. 8 slides exported to ${OUT_DIR}`);
