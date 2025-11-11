# ExpandNote Logo Design

**Date:** 2025-11-10
**Status:** Approved
**Designer:** Claude Code
**Issue:** GitHub #16

## Design Brief

Create a creative logo that represents ExpandNote as a note-taking app with AI automation features, similar to N8N's workflow capabilities.

## Selected Concept: Circuit Paper - Tech Minimalism

A clean geometric note/paper shape with subtle circuit board traces integrated into the design, emphasizing the automation and workflow aspects while maintaining professional minimalism.

## Visual Design Specifications

### Primary Mark

**Core Elements:**
- Folded paper/document icon with geometric lines
- Corner fold (top-right) creating depth and dimension
- Subtle circuit board traces (horizontal/vertical paths with nodes)
- Outlined style (2-3px stroke weight) with negative space

**Dimensions:**
- Base size: 512x512px
- Aspect ratio: 1:1 (square)
- Export sizes: 16px, 32px, 48px, 180px, 192px, 512px

**Visual Metaphor:**
The paper represents notes; circuit traces represent AI automation flowing through content—like N8N's workflow nodes connecting and processing data.

## Color Palette

### Primary Colors
- **Brand Blue:** `#3B82F6` (blue-500) - Primary brand color
- **Dark Accent:** `#1E40AF` (blue-800) - Circuit traces in light mode
- **Light Blue:** `#60A5FA` (blue-400) - Dark mode variant

### Monochrome Versions
- Black (#000000) on transparent - Light mode
- White (#FFFFFF) on transparent - Dark mode
- Single-color favicons for browser tabs

## Logo Variations

### 1. Full Logo (Horizontal Lockup)
- Icon + "ExpandNote" wordmark
- Typeface: Geist Sans (matches app typography)
- Spacing: 0.75x icon width between icon and text
- Use cases: Website header, marketing materials, splash screens

### 2. Icon Only
- Square format without text
- Use cases: Favicons, app icons, social media avatars, mobile home screen

### 3. Dark Mode Variants
- Inverted colors for dark backgrounds
- Light blue (#60A5FA) for visibility
- White icon for pure dark backgrounds

## File Deliverables

```
public/
├── logo.svg              # Full color horizontal lockup (icon + text)
├── logo-icon.svg         # Icon only, full color
├── logo-dark.svg         # Dark mode horizontal lockup
├── logo-icon-dark.svg    # Icon only, dark mode
├── favicon.ico           # Multi-size ICO (16,32,48px)
├── apple-touch-icon.png  # 180x180 for iOS Safari
├── icon-192.png          # PWA manifest (Android)
├── icon-512.png          # PWA manifest (Android)
└── og-image.png          # 1200x630 for social sharing (optional)
```

## Integration Points

### Next.js Metadata (app/layout.tsx)
```typescript
export const metadata: Metadata = {
  title: "ExpandNote - AI-Powered Note Taking",
  description: "...",
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/logo-icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
};
```

### PWA Manifest (public/manifest.json)
```json
{
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Mobile (Capacitor)
- iOS: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Android: `android/app/src/main/res/mipmap-*/ic_launcher.png`

## Design Rationale

### Why Circuit Paper?
1. **Professional & Modern:** Clean geometric aesthetic matches modern SaaS applications
2. **Scalability:** Simple shapes scale perfectly from 16px favicons to large displays
3. **Meaningful:** Circuit traces directly communicate automation/AI capabilities
4. **Versatile:** Works in monochrome, full color, light/dark modes
5. **Distinctive:** Unique combination of paper + circuits differentiates from generic note apps

### Alignment with Brand
- Matches tech-forward positioning
- Emphasizes automation (like N8N)
- Professional enough for business users
- Modern enough for tech-savvy audience

## Implementation Notes

1. All SVG files use clean, hand-coded paths (no auto-generated bloat)
2. Colors defined as CSS custom properties for theme flexibility
3. Stroke-based design ensures crisp rendering at all sizes
4. Favicons use simplified version for legibility at small sizes

## Success Criteria

- Logo is recognizable at 16px (favicon size)
- Works in both light and dark themes
- Clearly communicates "note-taking + automation"
- Scalable vector format for all sizes
- Fast loading (SVG files < 5KB each)

## Next Steps

1. Generate all SVG files with production-ready code
2. Export PNG variants at required sizes
3. Create multi-size favicon.ico
4. Integrate into Next.js metadata and layout
5. Test visibility across light/dark themes
6. Update README with new logo
