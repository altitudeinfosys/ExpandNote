import { Stack } from 'expo-router';
import { useSync } from '@/contexts/SyncContext';
import { ConflictResolutionModal } from '@/components/ConflictResolutionModal';

export default function AppLayout() {
  const { currentConflict, resolveConflict, dismissConflict } = useSync();

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="note/[id]"
          options={{
            presentation: 'card',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="note/new"
          options={{
            presentation: 'card',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="profile/[id]"
          options={{
            presentation: 'card',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="tags"
          options={{
            presentation: 'card',
            headerShown: true,
          }}
        />
      </Stack>
      <ConflictResolutionModal
        visible={currentConflict !== null}
        conflict={currentConflict}
        onResolve={resolveConflict}
        onDismiss={dismissConflict}
      />
    </>
  );
}
