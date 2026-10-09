const SUFFIX = '.apps.googleusercontent.com';

export type GoogleOAuthEnv = {
  android?: string | undefined;
  ios?: string | undefined;
};

/**
 * Google's Android and iOS client types have no secret and no https redirect.
 * Android returns to its package name; iOS to its reversed client ID.
 */
export function googleOAuthConfig(
  os: string,
  env: GoogleOAuthEnv,
  androidPackage: string,
) {
  if (os === 'android') {
    const clientId = env.android?.trim();
    if (!clientId)
      throw new Error(
        'Google sign-in is not set up yet. Add EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID to your .env and restart Expo.',
      );
    return { clientId, redirectUri: `${androidPackage}:/oauthredirect` };
  }
  if (os === 'ios') {
    const clientId = env.ios?.trim();
    if (!clientId)
      throw new Error(
        'Google sign-in is not set up yet. Add EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID to your .env and restart Expo.',
      );
    const id = clientId.endsWith(SUFFIX)
      ? clientId.slice(0, -SUFFIX.length)
      : clientId;
    return {
      clientId,
      redirectUri: `com.googleusercontent.apps.${id}:/oauthredirect`,
    };
  }
  throw new Error('Google sign-in is available on Android and iOS only.');
}
