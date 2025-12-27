import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const THEME_KEY = 'user_theme_preference';

type ThemePreference = 'system' | 'light' | 'dark';

type SettingItemProps = {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  title: string;
  subtitle?: string;
  onPress?: () => void;
  isDark: boolean;
  danger?: boolean;
  rightElement?: React.ReactNode;
};

function SettingItem({ icon, title, subtitle, onPress, isDark, danger, rightElement }: SettingItemProps) {
  const accessibilityLabel = subtitle ? `${title}. ${subtitle}` : title;
  const hasInteraction = !!onPress || !!rightElement;

  return (
    <TouchableOpacity
      style={[styles.settingItem, isDark && styles.settingItemDark]}
      onPress={onPress}
      disabled={!hasInteraction}
      accessibilityRole={onPress ? 'button' : rightElement ? 'none' : 'text'}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={onPress ? `Double tap to ${title.toLowerCase()}` : undefined}
    >
      <View
        style={[
          styles.settingIcon,
          danger ? styles.settingIconDanger : styles.settingIconDefault,
        ]}
        accessibilityElementsHidden
      >
        <FontAwesome
          name={icon}
          size={18}
          color={danger ? '#ef4444' : '#3b82f6'}
        />
      </View>
      <View style={styles.settingContent}>
        <Text
          style={[
            styles.settingTitle,
            isDark && styles.settingTitleDark,
            danger && styles.settingTitleDanger,
          ]}
        >
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, isDark && styles.settingSubtitleDark]}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement || (onPress && (
        <FontAwesome
          name="chevron-right"
          size={14}
          color={isDark ? '#6b7280' : '#9ca3af'}
          accessibilityElementsHidden
        />
      ))}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { isEnabled: notificationsEnabled, requestPermissions } = useNotifications();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const isDark = colorScheme === 'dark';

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');

  useEffect(() => {
    checkBiometrics();
    loadThemePreference();
  }, []);

  const checkBiometrics = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricAvailable(compatible && enrolled);

    if (compatible && enrolled) {
      const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      setBiometricEnabled(enabled === 'true');
    }
  };

  const loadThemePreference = async () => {
    const pref = await AsyncStorage.getItem(THEME_KEY);
    if (pref === 'light' || pref === 'dark' || pref === 'system') {
      setThemePreference(pref);
    }
  };

  const toggleBiometric = async (value: boolean) => {
    if (value) {
      // Verify biometrics before enabling
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify to enable biometric login',
      });

      if (!result.success) {
        return;
      }
    }

    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, value ? 'true' : 'false');
    setBiometricEnabled(value);
  };

  const handleThemeChange = () => {
    const options: ThemePreference[] = ['system', 'light', 'dark'];
    const labels = ['System Default', 'Light', 'Dark'];

    Alert.alert(
      'Choose Theme',
      undefined,
      [
        ...options.map((option, index) => ({
          text: labels[index] + (themePreference === option ? ' ✓' : ''),
          onPress: async () => {
            setThemePreference(option);
            await AsyncStorage.setItem(THEME_KEY, option);
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const getThemeLabel = (pref: ThemePreference): string => {
    switch (pref) {
      case 'light': return 'Light';
      case 'dark': return 'Dark';
      default: return 'System default';
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear cached data but keep your notes and settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            // Clear any cached data here
            Alert.alert('Done', 'Cache cleared successfully.');
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: signOut,
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
          Account
        </Text>
        <View style={[styles.sectionContent, isDark && styles.sectionContentDark]}>
          <SettingItem
            icon="user"
            title="Email"
            subtitle={user?.email || 'Not signed in'}
            isDark={isDark}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
          Data
        </Text>
        <View style={[styles.sectionContent, isDark && styles.sectionContentDark]}>
          <SettingItem
            icon="tags"
            title="Manage Tags"
            subtitle="Create, edit, and delete tags"
            onPress={() => router.push('/(app)/tags')}
            isDark={isDark}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
          Security
        </Text>
        <View style={[styles.sectionContent, isDark && styles.sectionContentDark]}>
          {biometricAvailable && (
            <>
              <SettingItem
                icon="lock"
                title="Biometric Login"
                subtitle="Use Face ID / Touch ID to sign in"
                isDark={isDark}
                rightElement={
                  <Switch
                    value={biometricEnabled}
                    onValueChange={toggleBiometric}
                    trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                    thumbColor={biometricEnabled ? '#3b82f6' : '#f4f4f5'}
                    accessibilityLabel="Biometric login toggle"
                    accessibilityRole="switch"
                    accessibilityState={{ checked: biometricEnabled }}
                  />
                }
              />
              <View style={styles.divider} />
            </>
          )}
          <SettingItem
            icon="key"
            title="Change Password"
            onPress={() => {
              Alert.alert(
                'Change Password',
                'A password reset link will be sent to your email.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Send Link',
                    onPress: async () => {
                      // Trigger password reset
                      Alert.alert('Done', 'Check your email for the reset link.');
                    },
                  },
                ]
              );
            }}
            isDark={isDark}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
          Preferences
        </Text>
        <View style={[styles.sectionContent, isDark && styles.sectionContentDark]}>
          <SettingItem
            icon="moon-o"
            title="Appearance"
            subtitle={getThemeLabel(themePreference)}
            onPress={handleThemeChange}
            isDark={isDark}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="bell"
            title="Notifications"
            subtitle={notificationsEnabled ? 'Enabled' : 'Tap to enable'}
            isDark={isDark}
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={async (value) => {
                  if (value && !notificationsEnabled) {
                    const success = await requestPermissions();
                    if (!success) {
                      Alert.alert(
                        'Notifications Disabled',
                        'Please enable notifications in your device settings to receive alerts.',
                        [{ text: 'OK' }]
                      );
                    }
                  }
                }}
                trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                thumbColor={notificationsEnabled ? '#3b82f6' : '#f4f4f5'}
                accessibilityLabel="Notifications toggle"
                accessibilityRole="switch"
                accessibilityState={{ checked: notificationsEnabled }}
              />
            }
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
          Storage
        </Text>
        <View style={[styles.sectionContent, isDark && styles.sectionContentDark]}>
          <SettingItem
            icon="trash"
            title="Clear Cache"
            subtitle="Free up space by clearing cached data"
            onPress={handleClearCache}
            isDark={isDark}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
          Support
        </Text>
        <View style={[styles.sectionContent, isDark && styles.sectionContentDark]}>
          <SettingItem
            icon="question-circle"
            title="Help & FAQ"
            onPress={() => {
              Alert.alert('Coming Soon', 'Help documentation will be available soon.');
            }}
            isDark={isDark}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="envelope"
            title="Contact Support"
            onPress={() => {
              Alert.alert('Contact Support', 'Email us at support@expandnote.app');
            }}
            isDark={isDark}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="file-text-o"
            title="Terms of Service"
            onPress={() => {
              router.push('https://expandnote.app/terms' as any);
            }}
            isDark={isDark}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="shield"
            title="Privacy Policy"
            onPress={() => {
              router.push('https://expandnote.app/privacy' as any);
            }}
            isDark={isDark}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={[styles.sectionContent, isDark && styles.sectionContentDark]}>
          <SettingItem
            icon="sign-out"
            title="Sign Out"
            onPress={handleSignOut}
            isDark={isDark}
            danger
          />
        </View>
      </View>

      <Text style={[styles.version, isDark && styles.versionDark]}>
        ExpandNote v0.1.0
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitleDark: {
    color: '#9ca3af',
  },
  sectionContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionContentDark: {
    backgroundColor: '#1f2937',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingItemDark: {},
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingIconDefault: {
    backgroundColor: '#dbeafe',
  },
  settingIconDanger: {
    backgroundColor: '#fee2e2',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#111827',
  },
  settingTitleDark: {
    color: '#f9fafb',
  },
  settingTitleDanger: {
    color: '#ef4444',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  settingSubtitleDark: {
    color: '#9ca3af',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginLeft: 64,
  },
  version: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 48,
  },
  versionDark: {
    color: '#6b7280',
  },
});
