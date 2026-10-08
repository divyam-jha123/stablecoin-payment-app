import { router } from 'expo-router';
import { PlaceholderScreen } from '../src/components/placeholder-screen';
import { PreviewFlowBar } from '../src/components/preview-flow-bar';

export default function Failed() {
  return (
    <>
      <PlaceholderScreen title="Payment Failed (placeholder)" />
      <PreviewFlowBar
        status="Failed"
        actions={[
          { label: 'Retry ›', onPress: () => router.replace('/processing') },
          { label: 'Success ›', onPress: () => router.replace('/success') },
          { label: 'Home ›', onPress: () => router.replace('/home') },
        ]}
      />
    </>
  );
}
