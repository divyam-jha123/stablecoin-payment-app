import * as LocalAuthentication from 'expo-local-authentication';

/** Whether the phone has a fingerprint, face or PIN/pattern set up. */
export async function phoneHasLock() {
  const level = await LocalAuthentication.getEnrolledLevelAsync();
  return level !== LocalAuthentication.SecurityLevel.NONE;
}

/** Asks for the phone's fingerprint, face or PIN. MetaMask is never opened. */
export async function authenticate(promptMessage: string) {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });
  return result.success;
}
