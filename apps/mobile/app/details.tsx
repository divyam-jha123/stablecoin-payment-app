import { router } from 'expo-router';
import { PlaceholderScreen } from '../src/components/placeholder-screen';
import { PreviewFlowBar } from '../src/components/preview-flow-bar';
import { useScheme } from '../src/theme/color-scheme-store';

export default function Details() {
  // Redraw in the new colours when the theme switches.
  useScheme();
  return (
    <>
      <PlaceholderScreen title="Transaction Details" />
      <PreviewFlowBar
        status="Transaction details"
        actions={[
          { label: 'Activity ›', onPress: () => router.replace('/activity') },
          { label: 'Home ›', onPress: () => router.replace('/home') },
        ]}
      />
    </>
  );
}
