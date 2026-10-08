import { router } from 'expo-router';
import { PlaceholderScreen } from '../src/components/placeholder-screen';
import { PreviewFlowBar } from '../src/components/preview-flow-bar';

export default function Details() {
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
