import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppLock } from '../src/components/app-lock';
import { startBackendWake } from '../src/features/backend-wake';

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1 }, mutations: { retry: false } },
      }),
  );
  useEffect(() => startBackendWake(), []);
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        {/* Android's default transition fades the old page out while the new one
            rises from below; slide instead, on white so the black window never
            shows through mid-transition. */}
        <Stack
          screenOptions={{
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: '#ffffff' },
          }}
        />
        <AppLock />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
