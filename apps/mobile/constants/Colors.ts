// ExpandNote brand colors
const primaryLight = '#3b82f6';
const primaryDark = '#60a5fa';

export default {
  light: {
    // Primary
    primary: primaryLight,
    primaryForeground: '#ffffff',

    // Background & Surface
    background: '#f9fafb',
    surface: '#ffffff',
    surfaceSecondary: '#f3f4f6',

    // Text
    text: '#111827',
    textSecondary: '#6b7280',
    textMuted: '#9ca3af',

    // Borders
    border: '#e5e7eb',
    borderSecondary: '#d1d5db',

    // Tab Bar
    tint: primaryLight,
    tabIconDefault: '#9ca3af',
    tabIconSelected: primaryLight,

    // Status colors
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  dark: {
    // Primary
    primary: primaryDark,
    primaryForeground: '#111827',

    // Background & Surface
    background: '#111827',
    surface: '#1f2937',
    surfaceSecondary: '#374151',

    // Text
    text: '#f9fafb',
    textSecondary: '#9ca3af',
    textMuted: '#6b7280',

    // Borders
    border: '#374151',
    borderSecondary: '#4b5563',

    // Tab Bar
    tint: primaryDark,
    tabIconDefault: '#6b7280',
    tabIconSelected: primaryDark,

    // Status colors
    success: '#4ade80',
    warning: '#fbbf24',
    error: '#f87171',
  },
};

// Theme type export
export type ColorScheme = 'light' | 'dark';
export type ThemeColors = typeof import('./Colors').default.light;
