import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AppIcon } from './payment-ui';
import { homeTheme as theme } from '../theme/home';
import { tc, themedStyleSheet } from '../theme/themed';
import {
  formatInr,
  merchantInitials,
  paidDayLabel,
  type MerchantSummary,
} from '../features/payment/merchants';

// Pastel circle with darker initials, picked from the name so it never changes.
const AVATAR_TONES = [
  { background: '#fde3c4', color: '#9a4a06' },
  { background: '#d7f2dc', color: '#1d7a35' },
  { background: '#ece1fb', color: '#6b3fc4' },
  { background: '#dbe9ff', color: '#1e5aa8' },
  { background: '#fbdbe6', color: '#b3305e' },
  { background: '#d4f1ee', color: '#0c776b' },
] as const;

function avatarTone(name: string) {
  let hash = 0;
  for (const char of name.trim().toLowerCase())
    hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length]!;
}

const STAR =
  'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z';

function Star({ filled }: { filled: boolean }) {
  return (
    <Svg
      width={26}
      height={26}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path
        d={STAR}
        stroke={tc(filled ? '#f5a524' : theme.colors.text)}
        fill={filled ? tc('#f5a524') : 'none'}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** A merchant on Payments: who they are, total paid and the last payment. */
export function MerchantCard({
  merchant,
  detail,
  favourite,
  disabled,
  onPress,
  onToggleFavourite,
}: {
  merchant: MerchantSummary;
  /** Second line, such as "Café · Pune" or "3 payments". */
  detail: string;
  favourite: boolean;
  disabled?: boolean;
  onPress: () => void;
  onToggleFavourite: () => void;
}) {
  const tone = avatarTone(merchant.name);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${merchant.name}. Total paid ${formatInr(merchant.total)}. Last paid ${formatInr(merchant.lastAmount)} ${paidDayLabel(merchant.lastPaidAt)}. View payment history.`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: tc(tone.background, 'bg') },
          ]}
        >
          <Text style={[styles.initials, { color: tc(tone.color) }]}>
            {merchantInitials(merchant.name)}
          </Text>
        </View>
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {merchant.name}
          </Text>
          <Text style={styles.detail} numberOfLines={1}>
            {detail}
          </Text>
          {merchant.vpa && (
            <Text style={styles.detail} numberOfLines={1}>
              @ {merchant.vpa}
            </Text>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            favourite
              ? `Remove ${merchant.name} from favourites`
              : `Add ${merchant.name} to favourites`
          }
          accessibilityState={{ selected: favourite }}
          disabled={disabled}
          onPress={onToggleFavourite}
          hitSlop={10}
          style={({ pressed }) => [styles.star, pressed && styles.pressed]}
        >
          <Star filled={favourite} />
        </Pressable>
      </View>
      <View style={styles.divider} />
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Total paid</Text>
          <Text style={styles.statValue} numberOfLines={1}>
            {formatInr(merchant.total)}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={[styles.stat, styles.lastStat]}>
          <Text style={styles.statLabel}>Last paid</Text>
          <Text style={styles.statValue} numberOfLines={1}>
            {formatInr(merchant.lastAmount)}
            <Text style={styles.statDay}>
              {' · '}
              {paidDayLabel(merchant.lastPaidAt)}
            </Text>
          </Text>
        </View>
        <AppIcon name="chevron-right" color={tc(theme.colors.text)} size={22} />
      </View>
    </Pressable>
  );
}

const AVATAR = 52;

const styles = themedStyleSheet({
  card: {
    borderRadius: theme.radius.surface + 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  pressed: { opacity: 0.7 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontSize: 17, fontWeight: '700' },
  identity: { flex: 1, minWidth: 0, gap: 3 },
  name: { color: theme.colors.text, fontSize: 17, fontWeight: '700' },
  detail: { color: theme.colors.muted, fontSize: 13, lineHeight: 18 },
  star: { padding: 2 },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginTop: theme.spacing.md,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  stat: { flex: 1, minWidth: 0, gap: 2 },
  lastStat: { paddingLeft: theme.spacing.lg },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: theme.colors.border,
  },
  statLabel: { color: theme.colors.muted, fontSize: 13 },
  statValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statDay: { fontSize: 15, fontWeight: '500' },
});
