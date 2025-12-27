import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';

type SettingItemProps = {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  title: string;
  subtitle?: string;
  onPress?: () => void;
  isDark: boolean;
  danger?: boolean;
};

function SettingItem({ icon, title, subtitle, onPress, isDark, danger }: SettingItemProps) {
  return (
    <TouchableOpacity
      style={[styles.settingItem, isDark && styles.settingItemDark]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View
        style={[
          styles.settingIcon,
          danger ? styles.settingIconDanger : styles.settingIconDefault,
        ]}
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
      {onPress && (
        <FontAwesome
          name="chevron-right"
          size={14}
          color={isDark ? '#6b7280' : '#9ca3af'}
        />
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

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
          Preferences
        </Text>
        <View style={[styles.sectionContent, isDark && styles.sectionContentDark]}>
          <SettingItem
            icon="bell"
            title="Notifications"
            subtitle="Manage notification preferences"
            onPress={() => {}}
            isDark={isDark}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="moon-o"
            title="Appearance"
            subtitle="System default"
            onPress={() => {}}
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
            onPress={() => {}}
            isDark={isDark}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="envelope"
            title="Contact Support"
            onPress={() => {}}
            isDark={isDark}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="file-text-o"
            title="Terms of Service"
            onPress={() => {}}
            isDark={isDark}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="shield"
            title="Privacy Policy"
            onPress={() => {}}
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
