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
        <Stack />
        <AppLock />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
