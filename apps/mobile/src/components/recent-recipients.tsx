import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from './payment-ui';
import { homeTheme } from '../theme/home';
import {
  profileAvatarColor,
  profileInitial,
} from '../features/account/profile-details';
import type { Recipient } from '../features/payment/simulated-payments';
import { tc, themedStyleSheet } from '../theme/themed';

const COLUMNS = 4;
const COLLAPSED = COLUMNS * 2;

/** Home grid of people and merchants paid before, newest first. */
export function RecentRecipients({
  recipients,
  onRecipient,
  onViewAll,
  onPayNew,
  disabled,
}: {
  recipients: readonly Recipient[];
  onRecipient: (recipient: Recipient) => void;
  onViewAll: () => void;
  onPayNew: () => void;
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const overflowing = recipients.length > COLLAPSED;
  const shown =
    overflowing && !expanded ? recipients.slice(0, COLLAPSED - 1) : recipients;

  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <Text accessibilityRole="header" style={styles.title}>
          Recent recipients
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View all payments"
          disabled={disabled}
          onPress={onViewAll}
          style={styles.viewAll}
        >
          <Text style={styles.link}>View all ›</Text>
        </Pressable>
      </View>
      <View style={styles.grid}>
        {shown.map((recipient) => (
          <Pressable
            key={recipient.id}
            accessibilityRole="button"
            accessibilityLabel={`${recipient.name}. View payment history.`}
            disabled={disabled}
            onPress={() => onRecipient(recipient)}
            style={({ pressed }) => [styles.cell, pressed && styles.pressed]}
          >
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: tc(profileAvatarColor(recipient.name), 'bg'),
                },
              ]}
            >
              <Text style={styles.initial}>
                {profileInitial(recipient.name)}
              </Text>
            </View>
            <Text numberOfLines={1} style={styles.name}>
              {recipient.name}
            </Text>
          </Pressable>
        ))}
        {overflowing && (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            accessibilityLabel={
              expanded ? 'Show fewer recipients' : 'Show more recipients'
            }
            onPress={() => setExpanded((open) => !open)}
            style={({ pressed }) => [styles.cell, pressed && styles.pressed]}
          >
            <View style={[styles.avatar, styles.more]}>
              <View style={expanded ? styles.flipped : undefined}>
                <AppIcon
                  name="chevron-down"
                  size={26}
                  color={tc(homeTheme.colors.primary)}
                />
              </View>
            </View>
            <Text style={styles.name}>{expanded ? 'Less' : 'More'}</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.divider} />
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPayNew}
        style={({ pressed }) => [styles.payNew, pressed && styles.pressed]}
      >
        <View style={styles.plus}>
          <AppIcon name="plus" size={18} color={tc('#ffffff')} />
        </View>
        <Text style={styles.payNewLabel}>Pay someone new</Text>
      </Pressable>
    </View>
  );
}

const AVATAR = 60;

const styles = themedStyleSheet({
  section: { gap: homeTheme.spacing.md },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: homeTheme.colors.text, fontSize: 16, fontWeight: '700' },
  viewAll: {
    minHeight: homeTheme.layout.touchTarget,
    justifyContent: 'center',
    paddingLeft: 12,
  },
  link: { color: homeTheme.colors.primary, fontSize: 13, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  cell: {
    width: `${100 / COLUMNS}%`,
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
  },
  pressed: { opacity: 0.7 },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 2,
    borderColor: homeTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { color: '#ffffff', fontSize: 24, fontWeight: '600' },
  more: { backgroundColor: '#f4f8ff', borderColor: '#cfe0ff' },
  flipped: { transform: [{ rotate: '180deg' }] },
  name: {
    color: homeTheme.colors.text,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: '100%',
  },
  divider: { height: 1, backgroundColor: homeTheme.colors.border },
  payNew: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 56,
    borderRadius: homeTheme.radius.surface,
    backgroundColor: '#e3efff',
  },
  plus: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: homeTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payNewLabel: {
    color: homeTheme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
