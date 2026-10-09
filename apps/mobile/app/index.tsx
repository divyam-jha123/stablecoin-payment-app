import { Stack } from 'expo-router';
import { SplashBackdrop } from '../src/components/splash-backdrop';

// AppLock owns the splash duration and opens the phone's native unlock prompt.
export default function Splash() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SplashBackdrop />
    </>
  );
}
