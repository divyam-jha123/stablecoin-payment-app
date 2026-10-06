import { useState } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PreviewNavigator } from '../src/components/preview-navigator';
import { uiPreviewEnabled } from '../src/ui-preview';

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1 }, mutations: { retry: false } },
      }),
  );
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Stack />
        {uiPreviewEnabled ? <PreviewNavigator /> : null}
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
