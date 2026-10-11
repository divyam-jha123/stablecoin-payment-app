import { useCallback, useEffect, useRef, useState } from 'react';
import { requireOptionalNativeModule } from 'expo';
import type { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

type SpeechModule = typeof ExpoSpeechRecognitionModule;

let speechModule: SpeechModule | null | undefined;

// Expo Go and builds made before the package was added have no native
// module. Requiring the package then logs "Cannot find native module"
// errors, so check for the module first and load the package only if found.
function loadSpeech(): SpeechModule | null {
  if (speechModule !== undefined) return speechModule;
  speechModule = null;
  if (requireOptionalNativeModule('ExpoSpeechRecognition')) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      speechModule = require('expo-speech-recognition')
        .ExpoSpeechRecognitionModule as SpeechModule;
    } catch {
      speechModule = null;
    }
  }
  return speechModule;
}

export type VoiceSearchState =
  | { status: 'idle' }
  | { status: 'listening' }
  | { status: 'error'; message: string }
  /** No speech module in this build; the keyboard's own mic still works. */
  | { status: 'keyboard'; message: string };

const errorMessages: Record<string, string> = {
  'not-allowed':
    'Microphone or speech permission is off. Turn it on in Settings to search by voice.',
  'no-speech': 'Didn’t catch that. Tap the mic and try again.',
  'speech-timeout': 'Didn’t catch that. Tap the mic and try again.',
  network: 'Voice search needs a connection. Check it and try again.',
  'service-not-allowed': 'Voice search is not available on this device.',
  'language-not-supported': 'Voice search is not available on this device.',
};

/** Speech-to-text for the search field; each result replaces the query. */
export function useVoiceSearch(onText: (text: string) => void) {
  const speech = useRef(loadSpeech()).current;
  const [state, setState] = useState<VoiceSearchState>({ status: 'idle' });
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  useEffect(() => {
    if (!speech) return;
    const subscriptions = [
      speech.addListener('result', (event) => {
        const transcript = event.results[0]?.transcript;
        if (transcript) onTextRef.current(transcript);
      }),
      speech.addListener('end', () =>
        setState((current) =>
          current.status === 'listening' ? { status: 'idle' } : current,
        ),
      ),
      speech.addListener('error', (event) => {
        if (event.error === 'aborted') return;
        setState({
          status: 'error',
          message:
            errorMessages[event.error] ??
            'Voice search stopped. Tap the mic and try again.',
        });
      }),
    ];
    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
      speech.abort();
    };
  }, [speech]);

  const start = useCallback(async () => {
    if (!speech) {
      setState({
        status: 'keyboard',
        message: 'Tap the mic on your keyboard to search by voice.',
      });
      return;
    }
    try {
      const permission = await speech.requestPermissionsAsync();
      if (!permission.granted) {
        setState({ status: 'error', message: errorMessages['not-allowed']! });
        return;
      }
      if (!speech.isRecognitionAvailable()) {
        setState({
          status: 'error',
          message: errorMessages['service-not-allowed']!,
        });
        return;
      }
      setState({ status: 'listening' });
      speech.start({
        lang: 'en-IN',
        interimResults: true,
        continuous: false,
        maxAlternatives: 1,
      });
    } catch {
      setState({
        status: 'error',
        message: 'Voice search could not start. Type your search instead.',
      });
    }
  }, [speech]);

  const stop = useCallback(() => {
    speech?.stop();
  }, [speech]);

  return { state, start, stop, available: speech !== null };
}
