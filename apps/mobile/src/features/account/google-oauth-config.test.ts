import { describe, expect, it } from 'vitest';
import { googleOAuthConfig } from './google-oauth-config';

const pkg = 'com.travellerpay.hackathon';

describe('Google OAuth config', () => {
  it('uses the package name as the Android redirect', () => {
    expect(
      googleOAuthConfig(
        'android',
        { android: ' a.apps.googleusercontent.com ' },
        pkg,
      ),
    ).toEqual({
      clientId: 'a.apps.googleusercontent.com',
      redirectUri: `${pkg}:/oauthredirect`,
    });
  });

  it('uses the reversed client ID as the iOS redirect', () => {
    expect(
      googleOAuthConfig(
        'ios',
        { ios: '123-abc.apps.googleusercontent.com' },
        pkg,
      ).redirectUri,
    ).toBe('com.googleusercontent.apps.123-abc:/oauthredirect');
  });

  it('asks for the right variable when the platform has no client ID', () => {
    expect(() => googleOAuthConfig('android', { ios: 'x' }, pkg)).toThrow(
      'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID',
    );
    expect(() => googleOAuthConfig('ios', { android: 'x' }, pkg)).toThrow(
      'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
    );
  });

  it('rejects other platforms', () => {
    expect(() => googleOAuthConfig('web', {}, pkg)).toThrow('Android and iOS');
  });
});
