#!/usr/bin/env node

// Simple favicon generator using sharp + to-ico
// Usage: node scripts/generate-favicons.js <source>  (source can be a URL or local path)

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const sharp = require('sharp');
const toIco = require('to-ico');

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  const buffer = await res.buffer();
  await fs.promises.writeFile(dest, buffer);
}

async function ensureDir(dir) {
  try {
    await fs.promises.mkdir(dir, { recursive: true });
  } catch (e) {}
}

async function convertToInitialPng(inputPath, outputPath) {
  // Composite the logo over a black background so white logos are visible
  const image = sharp(inputPath).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } });
  // Ensure the background is solid black by flattening
  await image.flatten({ background: '#000000' }).png().toFile(outputPath);
  return outputPath;
}

async function main() {
  const source = process.argv[2];
  if (!source) {
    console.error('Usage: node scripts/generate-favicons.js <source>');
    process.exit(1);
  }

  const publicDir = path.join(__dirname, '..', 'public');
  await ensureDir(publicDir);

  const tmpDir = path.join(__dirname, '.tmp_fav');
  await ensureDir(tmpDir);

  const sourcePath = path.join(tmpDir, 'source' + path.extname(source));
  const initialPng = path.join(tmpDir, 'initial.png');

  if (/^https?:\/\//i.test(source)) {
    console.log('Downloading source from', source);
    await download(source, sourcePath);
  } else {
    await fs.promises.copyFile(path.resolve(source), sourcePath);
  }

  await convertToInitialPng(sourcePath, initialPng);
  console.log('Converted source to PNG');

  const sizes = [16, 32, 48, 64, 96, 128, 180, 192, 256, 512];
  for (const size of sizes) {
    const out = path.join(tmpDir, `favicon-${size}.png`);
    // Resize from the flattened initial PNG so background stays black
    await sharp(initialPng).resize(size, size, { fit: 'contain' }).png().toFile(out);
    console.log(`Generated ${size}x${size}`);
  }

  // create ICO using to-ico from PNG buffers
  const icoPngs = [16, 32, 48, 64].map(s => path.join(tmpDir, `favicon-${s}.png`));
  const pngBuffers = await Promise.all(icoPngs.map(p => fs.promises.readFile(p)));
  const icoBuffer = await toIco(pngBuffers);
  await fs.promises.writeFile(path.join(publicDir, 'favicon.ico'), icoBuffer);
  console.log('Created public/favicon.ico');

  // copy others
  await fs.promises.copyFile(path.join(tmpDir, 'favicon-180.png'), path.join(publicDir, 'apple-touch-icon.png'));
  for (const size of [192, 256, 512]) {
    await fs.promises.copyFile(path.join(tmpDir, `favicon-${size}.png`), path.join(publicDir, `favicon-${size}.png`));
  }

  // cleanup
  try {
    const files = await fs.promises.readdir(tmpDir);
    for (const f of files) await fs.promises.unlink(path.join(tmpDir, f));
    await fs.promises.rmdir(tmpDir);
  } catch (e) {}

  console.log('Done. Favicons written to public/');
}

main().catch(err => {
  console.error('Error generating favicons:', err);
  process.exit(1);
});
