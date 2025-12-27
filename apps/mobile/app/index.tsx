import { Redirect } from 'expo-router';

export default function Index() {
  // This will redirect to the appropriate screen based on auth state
  // The AuthGate in _layout.tsx handles the actual routing
  return <Redirect href="/(app)" />;
}
