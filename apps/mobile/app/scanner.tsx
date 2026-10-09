import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ConnectWalletGate } from '../src/components/connect-wallet-gate';
import Constants from 'expo-constants';
import {
  CameraView,
  scanFromURLAsync,
  useCameraPermissions,
  type BarcodeScanningResult,
} from 'expo-camera';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { router, Stack } from 'expo-router';
import { useExplorer } from '../src/features/account/use-explorer';
import {
  Animated,
  Button,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Svg, { Defs, Mask, Path, Rect } from 'react-native-svg';
import {
  createTravelPeQr,
  isTravelPeQr,
  parsedQrResponseSchema,
  parseTravelPeQr,
  parseUpiPaymentDraft,
} from '@traveller/shared';
import { uiPreviewEnabled } from '../src/ui-preview';
import { useLowLight } from '../src/features/scanner/use-low-light';
import {
  UsdcTokenEmblem,
  UsdtTokenEmblem,
} from '../src/components/payment-logos';

const REQUEST_TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 1_500;
const MAX_SCAN_SIZE = 280;
const FRAME_PADDING = 12;
const DEFAULT_MESSAGE = 'Scan any QR code to pay';
const CORNER_COLOR = '#1a7cff';
const CORNER_DETECTED_COLOR = '#00974f';
// Corner capture motion after a scan: snap in, then straight back out.
const CAPTURE_IN_MS = 180;
const CAPTURE_OUT_MS = 200;
// How long after a scan before moving on; leaves a beat after the corners
// return.
const DETECTED_HOLD_MS = CAPTURE_IN_MS + CAPTURE_OUT_MS + 70;
// How far each corner moves in towards the QR when it is captured.
const CORNER_CAPTURE_INSET = 9;
const LOW_LIGHT_MESSAGE = 'Low light: flashlight turned on';
const LOW_LIGHT_MESSAGE_MS = 2_000;
const PAY_TOKENS = [
  { symbol: 'USDT', Emblem: UsdtTokenEmblem },
  { symbol: 'USDC', Emblem: UsdcTokenEmblem },
] as const;
type PayToken = (typeof PAY_TOKENS)[number]['symbol'];
// Corner brackets sit just outside the cut-out, one colour per corner.
const CORNER_OFFSET = 12;
// No amount, so Pay Merchant starts at ₹0 and the amount is typed in.
const SAMPLE_MERCHANT_QR =
  'upi://pay?pa=sample@upi&pn=Sample%20merchant&cu=INR';

type ScannedPayment =
  | { travelPeQr: string }
  | { merchantName: string; merchantVpa: string; inrAmount?: string };

type CameraLayout = { height: number; width: number };
type ScanFrame = { left: number; size: number; top: number };

function barcodeFitsScanFrame(
  result: BarcodeScanningResult,
  frame: ScanFrame,
): boolean {
  const points =
    result.cornerPoints.length > 0
      ? result.cornerPoints
      : result.bounds.size.width > 0 && result.bounds.size.height > 0
        ? [
            result.bounds.origin,
            {
              x: result.bounds.origin.x + result.bounds.size.width,
              y: result.bounds.origin.y + result.bounds.size.height,
            },
          ]
        : [];

  if (points.length === 0) return false;

  const minimumX = frame.left + FRAME_PADDING;
  const maximumX = frame.left + frame.size - FRAME_PADDING;
  const minimumY = frame.top + FRAME_PADDING;
  const maximumY = frame.top + frame.size - FRAME_PADDING;

  return points.every(
    ({ x, y }) =>
      x >= minimumX && x <= maximumX && y >= minimumY && y <= maximumY,
  );
}

function getApiBaseUrl(): string | null {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');

  const expoHost = Constants.expoConfig?.hostUri;
  if (!expoHost) return null;

  try {
    const hostname = new URL(`http://${expoHost}`).hostname;
    return `http://${hostname}:3000`;
  } catch {
    return null;
  }
}

function apiErrorMessage(value: unknown): string | null {
  if (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof value.error === 'object' &&
    value.error !== null &&
    'message' in value.error &&
    typeof value.error.message === 'string'
  ) {
    return value.error.message;
  }
  return null;
}

function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraLayout, setCameraLayout] = useState<CameraLayout | null>(null);
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [scanning, setScanning] = useState(true);
  const [payment, setPayment] = useState<ScannedPayment | null>(null);
  const [reading, setReading] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  // Once the user taps the torch, auto-flash leaves it alone.
  const [torchTouched, setTorchTouched] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);
  const [payToken, setPayToken] = useState<PayToken>('USDC');
  const navigationStarted = useRef(false);
  const requestInProgress = useRef(false);
  const activeRequest = useRef<AbortController | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lowLightMessageTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const lowLight = useLowLight(!uiPreviewEnabled && scanning && !torchOn);
  const detected = useRef(new Animated.Value(0)).current;
  const cornerColor = detected.interpolate({
    inputRange: [0, 1],
    outputRange: [CORNER_COLOR, CORNER_DETECTED_COLOR],
    extrapolate: 'clamp',
  });
  const capture = useRef(new Animated.Value(0)).current;
  const captureIn = capture.interpolate({
    inputRange: [0, 1],
    outputRange: [0, CORNER_CAPTURE_INSET],
  });
  const captureOut = Animated.multiply(captureIn, -1);

  const frame = useMemo<ScanFrame | null>(() => {
    if (!cameraLayout) return null;
    // Leave room for the top bar, the gallery button and the bottom sheet.
    const top = insets.top + 96;
    const size = Math.max(
      1,
      Math.min(
        cameraLayout.width - 136,
        cameraLayout.height - top - 340,
        MAX_SCAN_SIZE,
      ),
    );
    return { left: (cameraLayout.width - size) / 2, size, top };
  }, [cameraLayout, insets.top]);

  useEffect(
    () => () => {
      activeRequest.current?.abort();
      if (retryTimer.current) clearTimeout(retryTimer.current);
      if (navigationTimer.current) clearTimeout(navigationTimer.current);
      if (lowLightMessageTimer.current) {
        clearTimeout(lowLightMessageTimer.current);
      }
    },
    [],
  );

  // Turn the torch on in dim light. It is never turned off automatically: the
  // torch itself can brighten the sensor reading and cause on/off loops.
  useEffect(() => {
    if (!lowLight || torchTouched) return;
    setTorchOn(true);
    setMessage(LOW_LIGHT_MESSAGE);
    lowLightMessageTimer.current = setTimeout(() => {
      lowLightMessageTimer.current = null;
      setMessage((current) =>
        current === LOW_LIGHT_MESSAGE ? DEFAULT_MESSAGE : current,
      );
    }, LOW_LIGHT_MESSAGE_MS);
  }, [lowLight, torchTouched]);

  const resumeScanning = useCallback((nextMessage: string) => {
    setReading(false);
    setPayment(null);
    setMessage(nextMessage);
    retryTimer.current = setTimeout(() => {
      requestInProgress.current = false;
      setMessage(DEFAULT_MESSAGE);
      setScanning(true);
      retryTimer.current = null;
    }, RETRY_DELAY_MS);
  }, []);

  const submitQr = useCallback(
    async (qrData: string) => {
      if (requestInProgress.current) return;
      requestInProgress.current = true;
      setReading(true);
      setPayment(null);
      setScanning(false);
      setMessage('Reading QR code…');

      if (isTravelPeQr(qrData)) {
        try {
          const request = parseTravelPeQr(qrData);
          setPayment({ travelPeQr: qrData });
          setMessage(`Pay ${request.recipientName}`);
          setReading(false);
        } catch (error) {
          resumeScanning(
            error instanceof Error ? error.message : 'Invalid TravelPe QR code',
          );
        }
        return;
      }

      const apiBaseUrl = getApiBaseUrl();
      if (!apiBaseUrl) {
        resumeScanning('Unable to reach the payment service');
        return;
      }

      const controller = new AbortController();
      activeRequest.current = controller;
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(`${apiBaseUrl}/v1/qr/parse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qrData }),
          signal: controller.signal,
        });
        const responseBody: unknown = await response.json();

        if (!response.ok) {
          throw new Error(
            apiErrorMessage(responseBody) ??
              'This is not a supported UPI QR code',
          );
        }

        const parsedResponse = parsedQrResponseSchema.safeParse(responseBody);
        if (!parsedResponse.success) {
          throw new Error('The QR response could not be verified');
        }

        const { merchant, payment: parsedPayment } = parsedResponse.data.data;
        setMessage(`Pay ${merchant.name}`);
        setPayment({
          merchantName: merchant.name,
          merchantVpa: merchant.vpa,
          ...(parsedPayment.inrAmount === null
            ? {}
            : { inrAmount: parsedPayment.inrAmount }),
        });
      } catch (error) {
        resumeScanning(
          error instanceof Error && error.name === 'AbortError'
            ? 'The payment service did not respond'
            : error instanceof Error
              ? error.message
              : 'Could not read this QR code',
        );
      } finally {
        clearTimeout(timeout);
        activeRequest.current = null;
        setReading(false);
      }
    },
    [resumeScanning],
  );

  const handleBarcodeScanned = useCallback(
    (barcode: BarcodeScanningResult) => {
      if (!frame || requestInProgress.current) return;
      if (!barcodeFitsScanFrame(barcode, frame)) {
        setMessage('Center the QR code inside the frame');
        return;
      }
      void submitQr(barcode.data);
    },
    [frame, submitQr],
  );

  const scanFromGallery = useCallback(async () => {
    if (pickingImage || requestInProgress.current) return;
    setPickingImage(true);
    setScanning(false);
    try {
      const picked = await launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      const uri = picked.canceled ? undefined : picked.assets[0]?.uri;
      if (!uri) {
        setScanning(true);
        return;
      }
      const [found] = await scanFromURLAsync(uri, ['qr']);
      if (found?.data) {
        void submitQr(found.data);
      } else {
        requestInProgress.current = true;
        resumeScanning('No QR code found in that image');
      }
    } catch {
      requestInProgress.current = true;
      resumeScanning('Could not read that image');
    } finally {
      setPickingImage(false);
    }
  }, [pickingImage, resumeScanning, submitQr]);

  const handleCameraLayout = useCallback((event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    setCameraLayout({ height, width });
  }, []);

  // A valid scan turns the corners green, then goes to confirmation with the
  // chosen token; it can still be changed there.
  useEffect(() => {
    if (!payment || reading || navigationStarted.current) return;
    navigationStarted.current = true;
    Animated.parallel([
      Animated.timing(detected, {
        toValue: 1,
        duration: CAPTURE_IN_MS,
        useNativeDriver: false,
      }),
      // The corners snap in and return straight away, with no pause between.
      Animated.sequence([
        Animated.timing(capture, {
          toValue: 1,
          duration: CAPTURE_IN_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(capture, {
          toValue: 0,
          duration: CAPTURE_OUT_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    ]).start();
    navigationTimer.current = setTimeout(() => {
      navigationTimer.current = null;
      router.replace({
        pathname: '/confirmation',
        params: { ...payment, demoPaymentToken: payToken },
      });
    }, DETECTED_HOLD_MS);
  }, [capture, detected, payment, reading, payToken]);

  if (!uiPreviewEnabled && !permission) {
    return (
      <SafeAreaView style={styles.permissionScreen}>
        <Text style={styles.permissionText}>Checking camera permission…</Text>
      </SafeAreaView>
    );
  }

  if (!uiPreviewEnabled && permission && !permission.granted) {
    return (
      <SafeAreaView style={styles.permissionScreen}>
        <Text style={styles.permissionText}>
          Camera access is required to scan payment QR codes.
        </Text>
        {permission.canAskAgain ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void requestPermission()}
            style={({ pressed }) => [
              styles.permissionButton,
              pressed && styles.permissionButtonPressed,
            ]}
          >
            <Text style={styles.permissionButtonText}>Allow camera access</Text>
          </Pressable>
        ) : (
          <Text style={styles.permissionText}>
            Enable camera access for TravelPay in your device settings.
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.permissionSecondaryButton,
            pressed && styles.permissionButtonPressed,
          ]}
        >
          <Text style={styles.permissionSecondaryButtonText}>Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.cameraViewport} onLayout={handleCameraLayout}>
        <Stack.Screen options={{ headerShown: false }} />
        {!uiPreviewEnabled ? (
          <CameraView
            style={styles.camera}
            facing="back"
            enableTorch={torchOn}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanning ? handleBarcodeScanned : undefined}
          />
        ) : null}

        {frame ? (
          <>
            <Svg pointerEvents="none" style={styles.mask}>
              <Defs>
                <Mask
                  id="scanner-cutout"
                  x={0}
                  y={0}
                  width={cameraLayout?.width ?? 0}
                  height={cameraLayout?.height ?? 0}
                  maskUnits="userSpaceOnUse"
                  maskType="luminance"
                >
                  <Rect
                    x={0}
                    y={0}
                    width={cameraLayout?.width ?? 0}
                    height={cameraLayout?.height ?? 0}
                    fill="#ffffff"
                  />
                  <Rect
                    x={frame.left}
                    y={frame.top}
                    width={frame.size}
                    height={frame.size}
                    rx={24}
                    ry={24}
                    fill="#000000"
                  />
                </Mask>
              </Defs>
              <Rect
                x={0}
                y={0}
                width={cameraLayout?.width ?? 0}
                height={cameraLayout?.height ?? 0}
                fill="rgba(0, 0, 0, 0.35)"
                mask="url(#scanner-cutout)"
              />
            </Svg>

            <View
              pointerEvents="none"
              importantForAccessibility="no-hide-descendants"
              style={[
                styles.frame,
                {
                  height: frame.size + CORNER_OFFSET * 2,
                  left: frame.left - CORNER_OFFSET,
                  top: frame.top - CORNER_OFFSET,
                  width: frame.size + CORNER_OFFSET * 2,
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.corner,
                  styles.topLeft,
                  {
                    borderColor: cornerColor,
                    transform: [
                      { translateX: captureIn },
                      { translateY: captureIn },
                    ],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.corner,
                  styles.topRight,
                  {
                    borderColor: cornerColor,
                    transform: [
                      { translateX: captureOut },
                      { translateY: captureIn },
                    ],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.corner,
                  styles.bottomLeft,
                  {
                    borderColor: cornerColor,
                    transform: [
                      { translateX: captureIn },
                      { translateY: captureOut },
                    ],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.corner,
                  styles.bottomRight,
                  {
                    borderColor: cornerColor,
                    transform: [
                      { translateX: captureOut },
                      { translateY: captureOut },
                    ],
                  },
                ]}
              />
            </View>

            {!uiPreviewEnabled ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Upload QR code from gallery"
                accessibilityState={{ disabled: pickingImage || reading }}
                disabled={pickingImage || reading}
                onPress={() => void scanFromGallery()}
                style={({ pressed }) => [
                  styles.galleryButton,
                  { top: frame.top + frame.size + 40 },
                  pressed && styles.pressed,
                ]}
              >
                <Svg width={22} height={22} viewBox="0 0 24 24">
                  <Rect
                    x={3.5}
                    y={3.5}
                    width={17}
                    height={17}
                    rx={2}
                    stroke="#202124"
                    strokeWidth={1.8}
                    fill="none"
                  />
                  <Path d="M6.5 17l3.5-4.5 2.5 3 2-2.5 3 4z" fill="#202124" />
                </Svg>
                <Text style={styles.galleryText}>Upload from gallery</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}

        {uiPreviewEnabled && frame ? (
          <View
            style={[
              styles.previewActions,
              {
                top: frame.top,
                left: frame.left,
                width: frame.size,
                height: frame.size,
              },
            ]}
          >
            <Text style={styles.permissionText}>Camera preview</Text>
            <Button
              title="Use sample merchant QR"
              color="#ffffff"
              onPress={() => {
                const sample = parseUpiPaymentDraft(SAMPLE_MERCHANT_QR);
                setPayment({
                  merchantName: sample.merchantName,
                  merchantVpa: sample.vpa,
                  ...(sample.inrAmount ? { inrAmount: sample.inrAmount } : {}),
                });
                setMessage(`Pay ${sample.merchantName}`);
              }}
            />
            <Button
              title="Use sample TravelPe QR"
              color="#ffffff"
              onPress={() => {
                const travelPeQr = createTravelPeQr({
                  version: 1,
                  recipientId: 'divyam@travelpe',
                  recipientName: 'Divyam Jha',
                  currency: 'USDC',
                  note: 'Demo payment',
                });
                setPayment({ travelPeQr });
                setMessage('Pay Divyam Jha');
              }}
            />
          </View>
        ) : null}

        <View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
        >
          <View style={styles.sheetHandle} />
          <Text
            accessibilityLiveRegion="polite"
            numberOfLines={2}
            style={styles.sheetTitle}
          >
            {message}
          </Text>
          <Text style={styles.sheetSubtitle}>Pay with your crypto wallet</Text>
          <View accessibilityRole="radiogroup" style={styles.tokenRow}>
            {PAY_TOKENS.map(({ symbol, Emblem }, index) => {
              const selected = payToken === symbol;
              return (
                <Fragment key={symbol}>
                  {index > 0 ? <View style={styles.tokenDivider} /> : null}
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityLabel={`Pay with ${symbol}`}
                    accessibilityState={{ checked: selected }}
                    onPress={() => setPayToken(symbol)}
                    style={({ pressed }) => [
                      styles.tokenPill,
                      selected && styles.tokenPillSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Emblem size={40} />
                    <Text style={styles.tokenText}>{symbol}</Text>
                  </Pressable>
                </Fragment>
              );
            })}
          </View>
        </View>

        <SafeAreaView
          edges={['top']}
          pointerEvents="box-none"
          style={styles.controls}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close scanner"
            hitSlop={8}
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.closeLine, styles.closeLineForward]} />
            <View style={[styles.closeLine, styles.closeLineBackward]} />
          </Pressable>
          <View style={styles.topActions}>
            {!uiPreviewEnabled ? (
              <Pressable
                accessibilityRole="switch"
                accessibilityLabel="Flashlight"
                accessibilityState={{ checked: torchOn }}
                hitSlop={6}
                onPress={() => {
                  setTorchTouched(true);
                  setTorchOn((on) => !on);
                }}
                style={({ pressed }) => [
                  styles.torchButton,
                  torchOn && styles.torchButtonOn,
                  pressed && styles.pressed,
                ]}
              >
                <Svg width={26} height={26} viewBox="0 0 24 24">
                  <Path
                    d="M7 3h10v3.5l-2.5 3.5V21h-5V10L7 6.5z M7 6.5h10 M12 13.5v2.5"
                    stroke={torchOn ? '#202124' : '#ffffff'}
                    strokeWidth={1.9}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </Svg>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show my QR code"
              hitSlop={6}
              onPress={() => router.push('/receive')}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.pressed,
              ]}
            >
              <Svg width={30} height={30} viewBox="0 0 24 24">
                <Path
                  d="M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z"
                  stroke="#ffffff"
                  strokeWidth={1.8}
                  fill="none"
                />
                <Path
                  d="M5.5 5.5h2v2h-2z M16.5 5.5h2v2h-2z M5.5 16.5h2v2h-2z M14 14h3v3h-3z M18 18h3v3h-3z M18 14h3v2h-3z M14 18h2v3h-2z"
                  fill="#ffffff"
                />
              </Svg>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cameraViewport: { flex: 1, overflow: 'hidden' },
  previewActions: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 16,
  },
  screen: {
    backgroundColor: '#000000',
    flex: 1,
  },
  camera: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  mask: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  frame: {
    position: 'absolute',
  },
  corner: {
    height: 52,
    position: 'absolute',
    width: 52,
  },
  topLeft: {
    borderColor: CORNER_COLOR,
    borderLeftWidth: 5,
    borderTopLeftRadius: 28,
    borderTopWidth: 5,
    left: 0,
    top: 0,
  },
  topRight: {
    borderColor: CORNER_COLOR,
    borderRightWidth: 5,
    borderTopRightRadius: 28,
    borderTopWidth: 5,
    right: 0,
    top: 0,
  },
  bottomLeft: {
    borderColor: CORNER_COLOR,
    borderBottomLeftRadius: 28,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    bottom: 0,
    left: 0,
  },
  bottomRight: {
    borderColor: CORNER_COLOR,
    borderBottomRightRadius: 28,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    bottom: 0,
    right: 0,
  },
  galleryButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#e8eaed',
    borderRadius: 28,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
    position: 'absolute',
  },
  galleryText: {
    color: '#202124',
    fontSize: 17,
    fontWeight: '500',
  },
  sheet: {
    alignItems: 'center',
    backgroundColor: '#303134',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    bottom: 0,
    left: 0,
    paddingHorizontal: 24,
    paddingTop: 10,
    position: 'absolute',
    right: 0,
  },
  sheetHandle: {
    backgroundColor: '#e8eaed',
    borderRadius: 2,
    height: 3,
    marginBottom: 18,
    width: 32,
  },
  sheetTitle: {
    color: '#ffffff',
    fontSize: 20,
    textAlign: 'center',
  },
  sheetSubtitle: {
    color: '#bdc1c6',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  tokenRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    marginTop: 18,
  },
  tokenDivider: {
    backgroundColor: '#5f6368',
    height: 34,
    width: 1,
  },
  tokenPill: {
    alignItems: 'center',
    borderColor: '#5f6368',
    borderRadius: 30,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingLeft: 10,
    paddingRight: 24,
    paddingVertical: 8,
  },
  tokenPillSelected: {
    backgroundColor: 'rgba(26, 124, 255, 0.16)',
    borderColor: CORNER_COLOR,
  },
  tokenText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '500',
  },
  controls: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 0,
    paddingHorizontal: 12,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  topActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  closeButton: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    marginTop: 8,
    width: 48,
  },
  torchButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.34)',
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    marginTop: 8,
    width: 60,
  },
  torchButtonOn: {
    backgroundColor: '#e8eaed',
  },
  iconButton: {
    alignItems: 'center',
    height: 52,
    justifyContent: 'center',
    marginTop: 8,
    width: 52,
  },
  pressed: {
    opacity: 0.62,
  },
  closeLine: {
    backgroundColor: '#ffffff',
    height: 2,
    position: 'absolute',
    width: 23,
  },
  closeLineForward: {
    transform: [{ rotate: '45deg' }],
  },
  closeLineBackward: {
    transform: [{ rotate: '-45deg' }],
  },
  permissionScreen: {
    alignItems: 'center',
    backgroundColor: '#000000',
    flex: 1,
    gap: 20,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  permissionText: {
    color: '#ffffff',
    textAlign: 'center',
  },
  permissionButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#005ae1',
    borderRadius: 28,
    paddingVertical: 14,
  },
  permissionButtonPressed: {
    opacity: 0.8,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  permissionSecondaryButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderColor: '#ffffff',
    borderRadius: 28,
    borderWidth: 1,
    paddingVertical: 14,
  },
  permissionSecondaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

// Paying and receiving need a wallet: Google-only visitors connect one first.
export default function Scanner() {
  const { explorer } = useExplorer();
  return explorer ? (
    <ConnectWalletGate message="Connect your wallet to scan a UPI QR and pay." />
  ) : (
    <ScannerScreen />
  );
}
