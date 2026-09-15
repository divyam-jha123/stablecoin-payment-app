import type { PropsWithChildren } from 'react';
import { ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** Layout for route verification only. The user will supply design and theme. */
export function PlaceholderScreen({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Text accessibilityRole="header">{title}</Text>
        <Text>Screen placeholder. Design and functionality will be added in the roadmap phase.</Text>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
