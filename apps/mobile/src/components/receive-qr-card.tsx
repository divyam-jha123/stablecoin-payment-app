import { forwardRef, useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import qrcode from 'qrcode-generator';
import type { TravelPeCurrency } from '@traveller/shared';
import { AppIcon, colors } from './payment-ui';

const QUIET_ZONE = 4;

export interface ReceiveQrCardProps {
  qrValue: string | null;
  recipientName: string;
  recipientId: string;
  currency: TravelPeCurrency;
  requestedAmount?: string;
  requestedNote?: string;
  onCopy: () => void;
  onChangeCurrency: () => void;
}

function QrImage({ value }: { value: string }) {
  const { width } = useWindowDimensions();
  const size = Math.min(232, Math.max(120, width - 104));
  const matrix = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(value, 'Byte');
    qr.make();
    const count = qr.getModuleCount();
    const cells: string[] = [];
    for (let row = 0; row < count; row += 1) {
      for (let column = 0; column < count; column += 1) {
        if (qr.isDark(row, column)) {
          const x = column + QUIET_ZONE;
          const y = row + QUIET_ZONE;
          cells.push(`M${x} ${y}h1v1h-1z`);
        }
      }
    }
    return { path: cells.join(''), size: count + QUIET_ZONE * 2 };
  }, [value]);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="TravelPe payment QR code"
      style={styles.qrFrame}
    >
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${matrix.size} ${matrix.size}`}
      >
        <Rect width={matrix.size} height={matrix.size} fill="#ffffff" />
        <Path d={matrix.path} fill="#000000" />
      </Svg>
    </View>
  );
}

export const ReceiveQrCard = forwardRef<View, ReceiveQrCardProps>(
  function ReceiveQrCard(
    {
      qrValue,
      recipientName,
      recipientId,
      currency,
      requestedAmount,
      requestedNote,
      onCopy,
      onChangeCurrency,
    },
    ref,
  ) {
    return (
      <View style={styles.card}>
        <View ref={ref} collapsable={false} style={styles.exportArea}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {recipientName.trim().charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text numberOfLines={2} style={styles.name}>
              {recipientName}
            </Text>
          </View>

          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>T</Text>
            </View>
            <Text style={styles.brandName}>TravelPe</Text>
          </View>

          {qrValue ? (
            <QrImage value={qrValue} />
          ) : (
            <View style={styles.qrPlaceholder}>
              <Text style={styles.qrPlaceholderText}>
                Enter a valid amount to update your QR.
              </Text>
            </View>
          )}

          <Text style={styles.scanTitle}>Scan with TravelPe to pay</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Demo payment</Text>
          </View>
          <Text style={styles.requestedDetail}>Receiving in {currency}</Text>
          {requestedAmount ? (
            <Text style={styles.requestedDetail}>
              Requested: ₹{requestedAmount}
            </Text>
          ) : null}
          {requestedNote ? (
            <Text style={styles.requestedNote}>Note: {requestedNote}</Text>
          ) : null}
        </View>

        <View style={styles.rule} />

        <View style={styles.destinationRow}>
          <View style={styles.destinationCopy}>
            <Text style={styles.label}>Receiving in</Text>
            <View style={styles.currencyRow}>
              <View
                style={[
                  styles.tokenIcon,
                  currency === 'USDT' && styles.usdtIcon,
                  currency === 'pathUSD' && styles.pathUsdIcon,
                ]}
              >
                <Text style={styles.tokenIconText}>
                  {currency === 'USDC' ? 'C' : currency === 'USDT' ? 'T' : 'P'}
                </Text>
              </View>
              <Text style={styles.currency}>{currency}</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change receiving currency"
            onPress={onChangeCurrency}
            style={({ pressed }) => [
              styles.smallAction,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.smallActionText}>Change</Text>
          </Pressable>
        </View>

        <View style={styles.idRow}>
          <View style={styles.idCopy}>
            <Text style={styles.label}>TravelPe ID</Text>
            <Text numberOfLines={2} style={styles.recipientId}>
              {recipientId}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Copy TravelPe ID"
            onPress={onCopy}
            style={({ pressed }) => [
              styles.copyButton,
              pressed && styles.pressed,
            ]}
          >
            <AppIcon name="copy" color={colors.accent} size={20} />
          </Pressable>
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#edf5ff',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  exportArea: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#edf5ff',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: '100%',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#d5e7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.accent, fontSize: 18, fontWeight: '700' },
  name: { color: colors.ink, fontSize: 17, fontWeight: '700', flexShrink: 1 },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
    marginBottom: 12,
  },
  brandMark: {
    width: 23,
    height: 23,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  brandName: { color: colors.accent, fontSize: 16, fontWeight: '800' },
  qrFrame: { backgroundColor: '#ffffff', padding: 8, borderRadius: 8 },
  qrPlaceholder: {
    width: 232,
    height: 232,
    maxWidth: '100%',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 8,
  },
  qrPlaceholderText: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  scanTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 18,
  },
  badge: {
    backgroundColor: '#dcecff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 10,
  },
  badgeText: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  requestedDetail: { color: colors.muted, fontSize: 13, marginTop: 8 },
  requestedNote: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
    textAlign: 'center',
  },
  rule: {
    alignSelf: 'stretch',
    height: 1,
    backgroundColor: '#d2e2f7',
    marginTop: 24,
    marginBottom: 20,
  },
  destinationRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  destinationCopy: { gap: 7 },
  label: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  currencyRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  tokenIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  usdtIcon: { backgroundColor: '#008665' },
  pathUsdIcon: { backgroundColor: colors.ink },
  tokenIconText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  currency: { color: colors.ink, fontSize: 19, fontWeight: '700' },
  smallAction: {
    minWidth: 64,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallActionText: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  idRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 21,
  },
  idCopy: { flex: 1, gap: 5, marginRight: 8 },
  recipientId: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  copyButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.65 },
});
