# ExpandNote Mobile App - Testing Guide

This document describes how to test the ExpandNote mobile app, including unit tests, integration tests, and manual testing procedures.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Running Tests](#running-tests)
- [Manual Testing Checklist](#manual-testing-checklist)
- [Testing on Physical Devices](#testing-on-physical-devices)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before testing, ensure you have the following installed:

1. **Node.js** (v18+)
2. **pnpm** (package manager)
3. **Expo Go** app on your iOS/Android device (for manual testing)
4. **Xcode** (for iOS simulator testing - macOS only)
5. **Android Studio** (for Android emulator testing)

Install dependencies:
```bash
cd apps/mobile
pnpm install
```

---

## Running Tests

### Unit Tests

Run all unit tests:
```bash
pnpm test
```

Run tests in watch mode (re-runs on file changes):
```bash
pnpm test:watch
```

Run tests with coverage report:
```bash
pnpm test:coverage
```

### Test Structure

Tests are located in `__tests__/`:
```
__tests__/
├── components/
│   ├── NoteCard.test.tsx       # NoteCard component tests
│   └── ErrorBoundary.test.tsx  # ErrorBoundary tests
└── hooks/
    └── useHaptics.test.ts      # Haptics hook tests
```

### Writing New Tests

Example test structure:
```typescript
import { render, fireEvent } from '@testing-library/react-native';
import { MyComponent } from '../../components/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    const { getByText } = render(<MyComponent />);
    expect(getByText('Expected Text')).toBeTruthy();
  });

  it('handles user interaction', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<MyComponent onPress={onPress} />);
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalled();
  });
});
```

---

## Manual Testing Checklist

Use this checklist to manually test all app features before release.

### Core Features

- [ ] **Notes List**
  - [ ] View all notes
  - [ ] Pull to refresh
  - [ ] Empty state displays correctly
  - [ ] Filter tabs work (All, Favorites, Archived, Trash)
  - [ ] Swipe left to archive/delete
  - [ ] Swipe right to favorite

- [ ] **Create/Edit Note**
  - [ ] Create new note
  - [ ] Edit existing note
  - [ ] Title saves correctly
  - [ ] Content saves correctly
  - [ ] Auto-save works (changes persist on back)

- [ ] **Tags**
  - [ ] Add tags to notes
  - [ ] Remove tags from notes
  - [ ] Create new tags
  - [ ] Delete tags from settings

### Mobile Features (Phase 6)

- [ ] **Voice Input**
  - [ ] Microphone button appears in note editor
  - [ ] Recording starts on press
  - [ ] Pulse animation during recording
  - [ ] Transcription inserts into content
  - [ ] Error handling for network issues

- [ ] **Push Notifications**
  - [ ] Permission request works
  - [ ] Notifications enabled/disabled in settings
  - [ ] AI profile completion notification
  - [ ] Sync completion notification

- [ ] **Haptic Feedback**
  - [ ] Light haptic on favorite toggle
  - [ ] Medium haptic on archive
  - [ ] Heavy haptic on permanent delete
  - [ ] Success haptic on restore
  - [ ] Warning haptic on delete

- [ ] **Camera/Image Picker**
  - [ ] Camera button appears in toolbar
  - [ ] Take photo works
  - [ ] Choose from gallery works
  - [ ] Image inserts into note (if implemented)

### Offline Support (Phase 5)

- [ ] **Offline Mode**
  - [ ] Offline indicator appears when disconnected
  - [ ] Notes load from local cache
  - [ ] Create/edit notes offline
  - [ ] Changes sync when reconnected

- [ ] **Sync**
  - [ ] Sync indicator shows progress
  - [ ] Conflict resolution modal works
  - [ ] Manual sync from settings

### Authentication

- [ ] **Login**
  - [ ] Email/password login
  - [ ] Biometric login (if enabled)
  - [ ] Error messages display
  - [ ] Session persistence

- [ ] **Settings**
  - [ ] Biometric toggle works
  - [ ] Theme preference saves
  - [ ] Sign out works

### Accessibility

- [ ] **Screen Reader Support**
  - [ ] All buttons have labels
  - [ ] Notes announce title and content
  - [ ] Filter tabs announce selection state
  - [ ] Error messages are announced

---

## Testing on Physical Devices

### Using Expo Go

1. Start the development server:
   ```bash
   pnpm start
   ```

2. Scan the QR code with:
   - **iOS**: Camera app
   - **Android**: Expo Go app

3. The app will load on your device.

### Testing Specific Features

**Voice Input:**
- Ensure microphone permissions are granted
- Test in a quiet environment
- Test with background noise

**Push Notifications:**
- Accept notification permission when prompted
- Test by triggering an AI profile

**Haptics:**
- Only works on physical devices (not simulators)
- Feel for different feedback types

**Camera:**
- Test both front and back cameras
- Test photo library access

### iOS Simulator

```bash
pnpm ios
```

Or with a specific device:
```bash
expo start --ios --device "iPhone 15 Pro"
```

### Android Emulator

```bash
pnpm android
```

---

## Environment Variables

For testing API integrations, create `.env.local`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=https://expand-note.vercel.app
```

---

## Troubleshooting

### Common Issues

**Tests fail with "Cannot find module"**
```bash
pnpm install
```

**Expo cache issues**
```bash
pnpm clean
pnpm install
npx expo start --clear
```

**Metro bundler stuck**
```bash
npx expo start --clear
```

**iOS build fails**
```bash
cd ios && pod install && cd ..
```

**Android build fails**
```bash
cd android && ./gradlew clean && cd ..
```

### Debug Mode

Enable debug logs:
```bash
DEBUG=* pnpm start
```

### Network Issues

If API calls fail:
1. Check `.env.local` configuration
2. Verify Supabase project is running
3. Check network connectivity
4. Review console logs in Expo

---

## Performance Testing

### React Native Performance Monitor

Press `Shift + M` in terminal while app is running to open the performance monitor.

### Metrics to Monitor

- **JS FPS**: Should stay at 60fps
- **UI FPS**: Should stay at 60fps
- **RAM Usage**: Monitor for memory leaks
- **Bundle Size**: Check with `npx expo-updates assets`

---

## Contributing

When adding new features:

1. Write unit tests for new components/hooks
2. Update this testing guide with new manual test cases
3. Test on both iOS and Android
4. Test in light and dark modes
5. Test accessibility with VoiceOver/TalkBack
