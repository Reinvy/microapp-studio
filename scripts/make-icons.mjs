#!/usr/bin/env node
/**
 * Rasterise the clay app icon.
 *
 * The SVG source is the single authored asset; the PNGs shipped to the manifest
 * are generated from it so no external icon assets are needed.
 *
 * Usage: node scripts/make-icons.mjs
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const iconsDir = path.join(root, 'apps/studio-web/public/icons');
const source = path.join(iconsDir, 'icon.svg');
const sizes = [192, 512];

const svg = await readFile(source);
for (const size of sizes) {
  const target = path.join(iconsDir, `icon-${size}.png`);
  await sharp(svg, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toFile(target);
  console.log(`icons: wrote ${path.relative(root, target)} (${size}x${size})`);
}
