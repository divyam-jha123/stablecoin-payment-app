import { router, Stack } from 'expo-router';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Defs,
  Ellipse,
  LinearGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { AppIcon, colors, ui } from './payment-ui';
import { MetaMaskLogo } from './payment-logos';
import {
  connectStatusText,
  useWalletSignIn,
} from '../features/account/use-wallet-sign-in';

// Blue wallet holding a card, with a MetaMask badge and a UPI QR tile. Its
// edges fade out so it sits on the page background.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const walletArt = require('../../assets/illustrations/connect-wallet.webp');
const ART_RATIO = 786 / 542;

const SUCCESS = '#1f9d55';
const SUCCESS_TINT = '#e6f6ec';
const ACCENT_TINT = '#e8f0fd';

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/home');
}

/**
 * Shown on wallet-only screens (scan, receive) when the traveller signed in
 * with Google and has not connected a wallet yet.
 */
export function ConnectWalletGate({ message }: { message: string }) {
  const { width, height } = useWindowDimensions();
  // Connect right here; once the wallet is in, the screen behind this swaps in.
  const { signIn, busy, stage, error } = useWalletSignIn({
    onDone: () => {},
  });
  const artWidth = Math.min(width - 32, height * 0.3 * ART_RATIO, 420);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <SoftBackdrop width={width} height={height} />
      <SafeAreaView style={styles.safe}>
        <ScrollView
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={styles.content}
        >
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={8}
              onPress={goBack}
              style={({ pressed }) => [styles.round, pressed && ui.pressed]}
            >
              <AppIcon name="chevron-left" size={22} color={colors.ink} />
            </Pressable>
            <Text style={styles.wordmark}>
              Travel<Text style={styles.wordmarkAccent}>Pe</Text>
            </Text>
            <View style={styles.round} />
          </View>

          <View style={styles.signedIn}>
            <View style={styles.signedInCheck}>
              <AppIcon name="check" size={13} color="#fff" />
            </View>
            <Text style={styles.signedInText}>Signed in with Google</Text>
          </View>

          <Image
            accessibilityIgnoresInvertColors
            source={walletArt}
            resizeMode="contain"
            style={[
              styles.art,
              { width: artWidth, height: artWidth / ART_RATIO },
            ]}
          />

          <Text accessibilityRole="header" style={styles.title}>
            One last step.{'\n'}Connect your wallet.
          </Text>
          <Text style={styles.subtitle}>{message}</Text>

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: SUCCESS_TINT }]}>
                <View style={styles.rowCheck}>
                  <AppIcon name="check" size={16} color="#fff" />
                </View>
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Google account connected</Text>
                <Text style={styles.rowBody}>You’re signed in and ready.</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: ACCENT_TINT }]}>
                <AppIcon name="wallet" size={24} color={colors.accent} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Wallet connection needed</Text>
                <Text style={styles.rowBody}>
                  Connect MetaMask to enable payments.
                </Text>
              </View>
            </View>
          </View>

          {busy ? (
            <Text accessibilityLiveRegion="polite" style={styles.status}>
              {connectStatusText(stage)}
            </Text>
          ) : null}
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={() => void signIn()}
            style={({ pressed }) => [
              styles.connect,
              pressed && ui.pressed,
              busy && styles.disabled,
            ]}
          >
            <MetaMaskLogo size={30} />
            <Text style={styles.connectText}>
              {busy ? 'Waiting for MetaMask…' : 'Connect MetaMask'}
            </Text>
          </Pressable>

          <View style={styles.note}>
            <AppIcon name="lock" size={16} color={colors.muted} />
            <Text style={styles.noteText}>
              Connecting won’t make a payment.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={goBack}
            style={({ pressed }) => [styles.backLink, pressed && ui.pressed]}
          >
            <Text style={styles.backLinkText}>Back to home</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// Pale-blue curves behind the page, as in the design.
function SoftBackdrop({ width, height }: { width: number; height: number }) {
  return (
    <Svg
      pointerEvents="none"
      width={width}
      height={height}
      style={StyleSheet.absoluteFill}
    >
      <Defs>
        <LinearGradient id="gate-sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#f4f8fe" />
          <Stop offset="0.5" stopColor="#ffffff" />
          <Stop offset="1" stopColor="#f6f9fe" />
        </LinearGradient>
      </Defs>
      <Rect width={width} height={height} fill="url(#gate-sky)" />
      <Ellipse
        cx={-width * 0.15}
        cy={height * 0.3}
        rx={width * 0.45}
        ry={height * 0.16}
        fill="#e9f1fc"
        opacity={0.7}
      />
      <Ellipse
        cx={width * 1.15}
        cy={height * 0.32}
        rx={width * 0.4}
        ry={height * 0.14}
        fill="#e9f1fc"
        opacity={0.7}
      />
      <Ellipse
        cx={width * 1.05}
        cy={height * 1.02}
        rx={width * 0.35}
        ry={height * 0.12}
        fill="#e9f1fc"
        opacity={0.8}
      />
    </Svg>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  safe: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 16,
    alignItems: 'center',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  header: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eef3fb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  wordmarkAccent: { color: colors.accent },
  signedIn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: SUCCESS_TINT,
  },
  signedInCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: SUCCESS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signedInText: { color: '#14532d', fontSize: 15, fontWeight: '600' },
  art: { marginTop: 4 },
  title: {
    color: colors.ink,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.6,
    textAlign: 'center',
    marginTop: 4,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 340,
  },
  card: {
    alignSelf: 'stretch',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(246,249,254,0.9)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  rowIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: SUCCESS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  rowBody: { color: colors.muted, fontSize: 14 },
  divider: { height: 1, backgroundColor: colors.line, marginLeft: 62 },
  status: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 14,
  },
  error: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 14,
  },
  connect: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 14,
    marginTop: 18,
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  noteText: { color: colors.muted, fontSize: 14 },
  backLink: { marginTop: 14, paddingVertical: 6 },
  backLinkText: { color: colors.accent, fontSize: 16, fontWeight: '700' },
});
