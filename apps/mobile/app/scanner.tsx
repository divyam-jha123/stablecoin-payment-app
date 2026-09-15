import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Constants from 'expo-constants';
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from 'expo-camera';
import { router, Stack } from 'expo-router';
import {
  Button,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { parsedQrResponseSchema } from '@traveller/shared';

const REQUEST_TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 1_500;
const MAX_SCAN_SIZE = 300;
const FRAME_PADDING = 12;

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

export default function Scanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraLayout, setCameraLayout] = useState<CameraLayout | null>(null);
  const [message, setMessage] = useState('Scan QR code');
  const [scanning, setScanning] = useState(true);
  const requestInProgress = useRef(false);
  const activeRequest = useRef<AbortController | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const frame = useMemo<ScanFrame | null>(() => {
    if (!cameraLayout) return null;
    const size = Math.max(
      1,
      Math.min(
        cameraLayout.width - 64,
        cameraLayout.height - 200,
        MAX_SCAN_SIZE,
      ),
    );
    return {
      left: (cameraLayout.width - size) / 2,
      size,
      top: Math.max(72, (cameraLayout.height - size) / 2 - 28),
    };
  }, [cameraLayout]);

  useEffect(
    () => () => {
      activeRequest.current?.abort();
      if (retryTimer.current) clearTimeout(retryTimer.current);
    },
    [],
  );

  const resumeScanning = useCallback((nextMessage: string) => {
    setMessage(nextMessage);
    retryTimer.current = setTimeout(() => {
      requestInProgress.current = false;
      setMessage('Scan QR code');
      setScanning(true);
      retryTimer.current = null;
    }, RETRY_DELAY_MS);
  }, []);

  const submitQr = useCallback(
    async (qrData: string) => {
      requestInProgress.current = true;
      setScanning(false);
      setMessage('Reading QR code…');

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

        setMessage('QR code detected');
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

  const handleCameraLayout = useCallback((event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    setCameraLayout({ height, width });
  }, []);

  if (!permission) {
    return (
      <SafeAreaView style={styles.permissionScreen}>
        <Text style={styles.permissionText}>Checking camera permission…</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionScreen}>
        <Text style={styles.permissionText}>
          Camera access is required to scan merchant QR codes.
        </Text>
        {permission.canAskAgain ? (
          <Button
            title="Allow camera access"
            color="#ffffff"
            onPress={() => void requestPermission()}
          />
        ) : (
          <Text style={styles.permissionText}>
            Enable camera access for Traveller Pay in your device settings.
          </Text>
        )}
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.screen} onLayout={handleCameraLayout}>
      <Stack.Screen options={{ headerShown: false }} />
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanning ? handleBarcodeScanned : undefined}
      />

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
              fill="rgba(0, 0, 0, 0.72)"
              mask="url(#scanner-cutout)"
            />
          </Svg>

          <View
            pointerEvents="none"
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.frame,
              {
                height: frame.size,
                left: frame.left,
                top: frame.top,
                width: frame.size,
              },
            ]}
          >
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>

          <Text
            accessibilityLiveRegion="polite"
            style={[styles.status, { top: frame.top + frame.size + 36 }]}
          >
            {message}
          </Text>
        </>
      ) : null}

      <SafeAreaView pointerEvents="box-none" style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close scanner"
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.closeButton,
            pressed && styles.closeButtonPressed,
          ]}
        >
          <View style={[styles.closeLine, styles.closeLineForward]} />
          <View style={[styles.closeLine, styles.closeLineBackward]} />
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
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
    borderColor: '#ffffff',
    height: 48,
    position: 'absolute',
    width: 48,
  },
  topLeft: {
    borderLeftWidth: 4,
    borderTopLeftRadius: 22,
    borderTopWidth: 4,
    left: 0,
    top: 0,
  },
  topRight: {
    borderRightWidth: 4,
    borderTopRightRadius: 22,
    borderTopWidth: 4,
    right: 0,
    top: 0,
  },
  bottomLeft: {
    borderBottomLeftRadius: 22,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    bottom: 0,
    left: 0,
  },
  bottomRight: {
    borderBottomRightRadius: 22,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    bottom: 0,
    right: 0,
  },
  status: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '500',
    left: 24,
    position: 'absolute',
    right: 24,
    textAlign: 'center',
  },
  controls: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.34)',
    height: 48,
    justifyContent: 'center',
    marginLeft: 12,
    marginTop: 4,
    width: 48,
  },
  closeButtonPressed: {
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
});
