import { Stack } from 'expo-router';
import { SplashBackdrop } from '../src/components/splash-backdrop';
import { useScheme } from '../src/theme/color-scheme-store';

// AppLock owns the splash duration and opens the phone's native unlock prompt.
export default function Splash() {
  // Redraw in the new colours when the theme switches.
  useScheme();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SplashBackdrop />
    </>
  );
}
