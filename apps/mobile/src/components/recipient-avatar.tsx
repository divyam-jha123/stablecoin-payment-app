import { Text, View } from 'react-native';
import {
  profileAvatarColor,
  profileInitial,
} from '../features/account/profile-details';
import type { TransactionItem } from '../features/payment/simulated-payments';
import { tc } from '../theme/themed';

/**
 * A person's or merchant's picture: their brand mark when known, otherwise
 * their initial on a colour picked from the name. Recent payments, the payment
 * history header and the details sheet all use it, so it always matches.
 */
export function RecipientAvatar({
  name,
  brand,
  size,
}: {
  name: string;
  brand?: TransactionItem['brand'] | undefined;
  size: number;
}) {
  const circle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
  };
  if (brand)
    return (
      <View style={[circle, { backgroundColor: brand.background }]}>
        <Text
          numberOfLines={1}
          style={{
            color: brand.color,
            fontWeight: '800',
            letterSpacing: -0.3,
            fontSize: size * (brand.mark.length <= 2 ? 0.42 : 0.24),
          }}
        >
          {brand.mark}
        </Text>
      </View>
    );
  return (
    <View
      style={[
        circle,
        { backgroundColor: tc(profileAvatarColor(name || '?'), 'bg') },
      ]}
    >
      <Text
        style={{ color: '#ffffff', fontSize: size * 0.42, fontWeight: '600' }}
      >
        {profileInitial(name)}
      </Text>
    </View>
  );
}
