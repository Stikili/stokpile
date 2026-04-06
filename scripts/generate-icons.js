import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(__dirname, '../public/icon.svg');
const svgBuffer = readFileSync(svgPath);

const sizes = [192, 512];

for (const size of sizes) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(resolve(__dirname, `../public/icon-${size}.png`));
  console.log(`✓ Generated icon-${size}.png`);
}

// Apple touch icon (180x180)
await sharp(svgBuffer)
  .resize(180, 180)
  .png()
  .toFile(resolve(__dirname, '../public/apple-touch-icon.png'));
console.log('✓ Generated apple-touch-icon.png');

// Favicon (32x32)
await sharp(svgBuffer)
  .resize(32, 32)
  .png()
  .toFile(resolve(__dirname, '../public/favicon-32.png'));
console.log('✓ Generated favicon-32.png');

console.log('\nAll icons generated.');
