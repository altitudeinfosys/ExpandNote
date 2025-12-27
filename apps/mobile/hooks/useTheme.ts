import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export function useTheme() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  return {
    colorScheme,
    colors,
    isDark,
  };
}

export type Theme = ReturnType<typeof useTheme>;
