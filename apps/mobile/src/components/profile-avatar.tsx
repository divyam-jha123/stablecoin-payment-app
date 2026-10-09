import { Image, StyleSheet, Text, View } from 'react-native';
import {
  profileAvatarColor,
  profileInitial,
} from '../features/account/profile-details';

/** Shared profile picture: saved photo, or the first initial on its name color. */
export function ProfileAvatar({
  name,
  photoUri,
  size,
}: {
  name: string;
  photoUri: string | null;
  size: 36 | 68;
}) {
  const borderWidth = size === 68 ? 3 : 2;
  const avatarSize = size === 68 ? 58 : 30;

  return (
    <View
      style={[
        styles.ring,
        { width: size, height: size, borderRadius: size / 2, borderWidth },
      ]}
    >
      <View
        style={[
          styles.avatar,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            backgroundColor: profileAvatarColor(name),
          },
        ]}
      >
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            accessibilityIgnoresInvertColors
            style={styles.image}
          />
        ) : (
          <Text style={[styles.initial, { fontSize: size === 68 ? 28 : 16 }]}>
            {profileInitial(name)}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  initial: { color: '#ffffff', fontWeight: '500' },
});
