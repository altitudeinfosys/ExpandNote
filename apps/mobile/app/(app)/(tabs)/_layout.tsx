import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  const tintColor = colorScheme === 'dark' ? '#60a5fa' : '#3b82f6';
  const inactiveTintColor = colorScheme === 'dark' ? '#6b7280' : '#9ca3af';
  const backgroundColor = colorScheme === 'dark' ? '#111827' : '#ffffff';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tintColor,
        tabBarInactiveTintColor: inactiveTintColor,
        tabBarStyle: {
          backgroundColor,
          borderTopColor: colorScheme === 'dark' ? '#1f2937' : '#e5e7eb',
        },
        headerStyle: {
          backgroundColor,
        },
        headerTintColor: colorScheme === 'dark' ? '#f9fafb' : '#111827',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Notes',
          tabBarIcon: ({ color }) => <TabBarIcon name="sticky-note" color={color} />,
          headerRight: () => <SyncStatusIndicator />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => <TabBarIcon name="search" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profiles"
        options={{
          title: 'AI Profiles',
          tabBarIcon: ({ color }) => <TabBarIcon name="magic" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
        }}
      />
    </Tabs>
  );
}
