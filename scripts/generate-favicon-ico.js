const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

async function generateFaviconIco() {
  console.log('🎨 Generating favicon.ico from PNG files...\n');

  const publicDir = path.join(__dirname, '../public');

  const files = [
    path.join(publicDir, 'favicon-16.png'),
    path.join(publicDir, 'favicon-32.png'),
    path.join(publicDir, 'favicon-48.png'),
  ];

  // Check if all files exist
  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.error(`❌ Error: ${path.basename(file)} not found`);
      console.log('Run: node scripts/generate-favicons.js first');
      process.exit(1);
    }
  }

  try {
    const buffers = files.map(file => fs.readFileSync(file));
    const ico = await toIco(buffers);

    fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico);

    console.log('✅ favicon.ico created successfully!');

    // Clean up temporary PNG files
    console.log('\n🧹 Cleaning up temporary files...');
    files.forEach(file => {
      fs.unlinkSync(file);
      console.log(`   Deleted ${path.basename(file)}`);
    });

    console.log('\n✅ All done! Favicon files ready:');
    console.log('   - public/favicon.ico');
    console.log('   - public/apple-touch-icon.png');
    console.log('   - public/icon-192.png');
    console.log('   - public/icon-512.png');

  } catch (error) {
    console.error('❌ Error generating favicon.ico:', error);
    process.exit(1);
  }
}

generateFaviconIco();
