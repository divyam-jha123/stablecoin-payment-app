import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { googleOAuthConfig } from './google-oauth-config';
import {
  googleProfileSchema,
  type GoogleProfile,
} from './google-account-store';

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};
const USERINFO = 'https://openidconnect.googleapis.com/v1/userinfo';

export class GoogleSignInError extends Error {}

/**
 * Opens Google's sign-in page and returns the traveller's profile. Uses the
 * authorization-code flow with PKCE, so no client secret ships in the app.
 * Returns null when the traveller closes the page without signing in.
 */
export async function signInWithGoogle(): Promise<GoogleProfile | null> {
  // Expo Go carries its own app ID, so Google's Android/iOS clients cannot
  // return to it. Only a development or release build of TravelPe can.
  if (Constants.executionEnvironment === 'storeClient')
    throw new GoogleSignInError(
      'Google sign-in needs a TravelPe development build; it cannot run in Expo Go.',
    );
  let config;
  try {
    config = googleOAuthConfig(
      Platform.OS,
      {
        android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
        ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      },
      Constants.expoConfig?.android?.package ?? '',
    );
  } catch (cause) {
    throw new GoogleSignInError((cause as Error).message);
  }
  const { clientId: id, redirectUri } = config;
  const request = new AuthSession.AuthRequest({
    clientId: id,
    redirectUri,
    scopes: ['openid', 'profile', 'email'],
    usePKCE: true,
    extraParams: { prompt: 'select_account' },
  });
  const result = await request.promptAsync(discovery);
  if (result.type === 'cancel' || result.type === 'dismiss') return null;
  if (result.type !== 'success')
    throw new GoogleSignInError('Google sign-in failed. Please try again.');

  const tokens = await AuthSession.exchangeCodeAsync(
    {
      clientId: id,
      code: result.params.code ?? '',
      redirectUri,
      extraParams: { code_verifier: request.codeVerifier ?? '' },
    },
    discovery,
  );
  const response = await fetch(USERINFO, {
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
  });
  if (!response.ok)
    throw new GoogleSignInError('Could not read your Google profile.');
  const info = (await response.json()) as Record<string, unknown>;
  const profile = googleProfileSchema.safeParse({
    sub: info.sub,
    name: info.name ?? info.email,
    email: info.email,
    picture: info.picture,
  });
  if (!profile.success || info.email_verified === false)
    throw new GoogleSignInError(
      'Google did not return a verified email for this account.',
    );
  return profile.data;
}
