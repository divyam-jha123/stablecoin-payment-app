import { Platform } from 'react-native';

/** iOS development uses the simulated dashboard while sign-in is unavailable. */
export const iosDashboardPreview = __DEV__ && Platform.OS === 'ios';

/** Release builds always use the real wallet flow. */
export const uiPreviewEnabled =
  iosDashboardPreview ||
  (__DEV__ && process.env.EXPO_PUBLIC_UI_PREVIEW === '1');
