import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AppProviders from '../src/application/providers/AppProviders';
import { useAppStore } from '@/shared/lib/stores/app-store';

export default function RootLayout() {
  const theme = useAppStore((s) => s.theme);

  return (
    <AppProviders>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="tabs" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'Login' }} />
        <Stack.Screen name="register" options={{ title: 'Register' }} />
        <Stack.Screen name="scan-invite" options={{ title: 'Scan Invite' }} />
      </Stack>
    </AppProviders>
  );
}