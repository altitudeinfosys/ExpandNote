const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateFavicons() {
  console.log('🎨 Generating favicon files from SVG...\n');

  const svgPath = path.join(__dirname, '../public/logo-icon.svg');
  const publicDir = path.join(__dirname, '../public');

  if (!fs.existsSync(svgPath)) {
    console.error('❌ Error: logo-icon.svg not found at', svgPath);
    process.exit(1);
  }

  const svg = fs.readFileSync(svgPath);

  try {
    // Generate apple-touch-icon.png (180x180)
    console.log('⏳ Generating apple-touch-icon.png (180x180)...');
    await sharp(svg)
      .resize(180, 180)
      .png()
      .toFile(path.join(publicDir, 'apple-touch-icon.png'));
    console.log('✅ apple-touch-icon.png created');

    // Generate icon-192.png (for PWA)
    console.log('⏳ Generating icon-192.png (192x192)...');
    await sharp(svg)
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'icon-192.png'));
    console.log('✅ icon-192.png created');

    // Generate icon-512.png (for PWA)
    console.log('⏳ Generating icon-512.png (512x512)...');
    await sharp(svg)
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'icon-512.png'));
    console.log('✅ icon-512.png created');

    // Generate favicon sizes for ICO
    console.log('⏳ Generating favicon PNG sizes (16, 32, 48)...');
    await sharp(svg)
      .resize(16, 16)
      .png()
      .toFile(path.join(publicDir, 'favicon-16.png'));

    await sharp(svg)
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'favicon-32.png'));

    await sharp(svg)
      .resize(48, 48)
      .png()
      .toFile(path.join(publicDir, 'favicon-48.png'));

    console.log('✅ Favicon PNG sizes created');

    console.log('\n✅ All PNG favicons generated successfully!');
    console.log('\n⚠️  Note: favicon.ico needs to be created manually.');
    console.log('You can use an online tool like:');
    console.log('- https://favicon.io/favicon-converter/');
    console.log('- https://realfavicongenerator.net/');
    console.log('\nOr use ImageMagick if installed:');
    console.log('convert favicon-16.png favicon-32.png favicon-48.png public/favicon.ico');

  } catch (error) {
    console.error('❌ Error generating favicons:', error);
    process.exit(1);
  }
}

generateFavicons();
