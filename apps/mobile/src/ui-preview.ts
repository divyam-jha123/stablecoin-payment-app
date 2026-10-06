/** Explicit local UI preview. Release builds always use the real wallet flow. */
export const uiPreviewEnabled =
  __DEV__ && process.env.EXPO_PUBLIC_UI_PREVIEW === '1';
