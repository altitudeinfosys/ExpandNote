# Logo Integration - Remaining Tasks

This document outlines tasks that require manual work or additional tools to complete the logo integration based on code review feedback.

## ✅ Completed Tasks

1. **Replaced `<img>` tags with Next.js `<Image>` component**
   - Fixed ESLint `@next/next/no-img-element` violations
   - Added explicit width/height attributes for better CLS (Cumulative Layout Shift)
   - Applied to: dashboard, login, signup pages

2. **Fixed theme switching**
   - Mobile header now properly switches between light/dark logo variants
   - Desktop sidebar now properly switches between light/dark logo variants
   - Both variants now render conditionally based on theme

3. **Updated favicon metadata**
   - Added theme-aware favicon configuration (light/dark mode)
   - Added apple-touch-icon configuration
   - Updated metadata in `src/app/layout.tsx`

## ⚠️ Remaining Manual Tasks

### 1. Generate PNG Favicon Files

**Files needed:**
- `public/favicon.ico` (multi-size: 16x16, 32x32, 48x48)
- `public/apple-touch-icon.png` (180x180)
- `public/icon-192.png` (192x192 for PWA)
- `public/icon-512.png` (512x512 for PWA)

**How to generate:**

Using **Inkscape** (recommended):
```bash
# Export from SVG to PNG at specific sizes
inkscape public/logo-icon.svg --export-filename=public/apple-touch-icon.png --export-width=180 --export-height=180
inkscape public/logo-icon.svg --export-filename=public/icon-192.png --export-width=192 --export-height=192
inkscape public/logo-icon.svg --export-filename=public/icon-512.png --export-width=512 --export-height=512

# For favicon.ico, export multiple sizes and combine
inkscape public/logo-icon.svg --export-filename=favicon-16.png --export-width=16 --export-height=16
inkscape public/logo-icon.svg --export-filename=favicon-32.png --export-width=32 --export-height=32
inkscape public/logo-icon.svg --export-filename=favicon-48.png --export-width=48 --export-height=48

# Combine into ICO (requires ImageMagick)
convert favicon-16.png favicon-32.png favicon-48.png public/favicon.ico
rm favicon-16.png favicon-32.png favicon-48.png
```

Using **ImageMagick** with rsvg:
```bash
convert -background none -density 300 public/logo-icon.svg -resize 180x180 public/apple-touch-icon.png
convert -background none -density 300 public/logo-icon.svg -resize 192x192 public/icon-192.png
convert -background none -density 300 public/logo-icon.svg -resize 512x512 public/icon-512.png
```

Using **Node.js with sharp** (if you install it):
```bash
npm install sharp
```

Then create a script `scripts/generate-favicons.js`:
```javascript
const sharp = require('sharp');
const fs = require('fs');

async function generateFavicons() {
  const svg = fs.readFileSync('public/logo-icon.svg');

  await sharp(svg).resize(180, 180).png().toFile('public/apple-touch-icon.png');
  await sharp(svg).resize(192, 192).png().toFile('public/icon-192.png');
  await sharp(svg).resize(512, 512).png().toFile('public/icon-512.png');

  // For favicon.ico, you'll need a separate tool or service
  console.log('PNGs generated. Use a tool like favicon.io to create favicon.ico');
}

generateFavicons();
```

Online alternatives:
- [favicon.io](https://favicon.io/favicon-converter/) - Upload SVG and download all sizes
- [realfavicongenerator.net](https://realfavicongenerator.net/) - Comprehensive favicon generator

### 2. Convert SVG Text to Paths

**Files affected:**
- `public/logo.svg` (line 32)
- `public/logo-dark.svg` (line 32)

**Issue:** The `<text>` elements may render inconsistently across browsers and platforms.

**Solution using Inkscape:**
```bash
# Convert text to paths in logo.svg
inkscape public/logo.svg --export-text-to-path --export-plain-svg=public/logo-converted.svg
mv public/logo-converted.svg public/logo.svg

# Convert text to paths in logo-dark.svg
inkscape public/logo-dark.svg --export-text-to-path --export-plain-svg=public/logo-dark-converted.svg
mv public/logo-dark-converted.svg public/logo-dark.svg
```

**Alternative:** Manually open each file in Inkscape:
1. Open `public/logo.svg` in Inkscape
2. Select the "ExpandNote" text
3. Go to Path → Object to Path
4. Save as "Plain SVG"
5. Repeat for `public/logo-dark.svg`

### 3. Create/Update PWA Manifest (Optional Enhancement)

Create `public/manifest.json`:
```json
{
  "name": "ExpandNote",
  "short_name": "ExpandNote",
  "description": "AI-powered note-taking app",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "theme_color": "#3B82F6",
  "background_color": "#ffffff",
  "display": "standalone",
  "start_url": "/"
}
```

Add to `src/app/layout.tsx` metadata:
```typescript
export const metadata: Metadata = {
  // ... existing metadata
  manifest: '/manifest.json',
};
```

### 4. Update README Logo (Optional Enhancement)

**Issue:** README uses light-mode logo which is barely visible in GitHub dark mode.

**Options:**
1. Use PNG exports instead of SVG
2. Use only the icon (no wordmark)
3. Create a GitHub-specific version with better contrast
4. Use GitHub's `picture` element for theme-aware images:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/logo-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="public/logo.svg">
  <img src="public/logo.svg" width="600" alt="ExpandNote">
</picture>
```

## Testing Checklist

After completing the remaining tasks:

- [ ] Verify favicon appears in browser tab (Chrome, Firefox, Safari, Edge)
- [ ] Verify favicon switches properly in dark mode
- [ ] Verify apple-touch-icon appears when saving to iOS home screen
- [ ] Verify PWA icons appear correctly in Android/Chrome
- [ ] Test logo rendering in all pages (dashboard, login, signup)
- [ ] Test theme switching on all pages
- [ ] Run `npm run build` to ensure no build errors
- [ ] Run `npm run lint` to ensure no ESLint errors
- [ ] Check lighthouse score for performance (CLS should improve)

## Notes

- Current SVG favicons will work in most modern browsers, but PNG fallbacks are recommended for older browsers
- The text-to-path conversion is optional but recommended for cross-browser consistency
- PWA manifest is optional but recommended if you plan to support mobile app installation
