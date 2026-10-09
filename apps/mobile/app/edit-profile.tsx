import { useMemo, useState, type ReactNode } from 'react';
import { router, Stack } from 'expo-router';
import { launchImageLibraryAsync } from 'expo-image-picker';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../src/components/payment-ui';
import { useAccount } from '../src/features/account/use-account';
import {
  COUNTRIES,
  daysInMonth,
  formatDateOfBirth,
  profileAvatarColor,
  profileInitial,
  MONTH_NAMES,
  NAME_MAX_LENGTH,
  profileErrors,
  toIsoDate,
  type ProfileDetails,
} from '../src/features/account/profile-details';
import {
  profileOwner,
  profileStore,
} from '../src/features/account/profile-details-store';

const BLUE = '#1f6feb';

const ICONS = {
  person:
    'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4.5 20.5c.6-3.6 3.6-5.5 7.5-5.5s6.9 1.9 7.5 5.5',
  mail: 'M3.5 6h17v12h-17z M3.5 7l8.5 6 8.5-6',
  calendar:
    'M4.5 6h15v14h-15z M4.5 10h15 M8.5 3.5v4 M15.5 3.5v4 M10 15h4 M12 13v4',
  pin: 'M12 21.5s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  lock: 'M6.5 11h11v9.5h-11z M8.5 11V8a3.5 3.5 0 0 1 7 0v3 M12 14.5v2.5',
  trash: 'M4.5 7h15 M9.5 7V4.5h5V7 M6.5 7l1 13h9l1-13 M10 11v5.5 M14 11v5.5',
  gallery:
    'M4 5h16v14H4z M4 16l4.5-4.5 3.5 3.5 2.5-2.5L20 17 M15.5 9.5a1.5 1.5 0 1 0 0-.01',
  camera:
    'M3.5 8.5h3.6l1.6-2.5h6.6l1.6 2.5h3.6v10.5h-17z M12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  chevronDown: 'M6 9l6 6 6-6',
  chevronLeft: 'M15 18l-6-6 6-6',
  chevronRight: 'M9 6l6 6-6 6',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
} as const;

function Glyph({
  name,
  color = BLUE,
  size = 22,
  strokeWidth = 2,
}: {
  name: keyof typeof ICONS;
  color?: string;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={ICONS[name]}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

// Each field has its own colour, like the Profile menu rows.
const TONES = {
  person: { tint: '#2f6bff', background: '#e3edff' },
  mail: { tint: '#7b4be0', background: '#efe7ff' },
  calendar: { tint: '#f08a16', background: '#fff0da' },
  pin: { tint: '#e5484d', background: '#fde4e4' },
} as const;
type FieldIcon = keyof typeof TONES;

/** Input box style: white card, coloured border while it is active. */
function inputStyle(icon: FieldIcon, active: boolean) {
  return [
    styles.input,
    active && { borderColor: TONES[icon].tint, borderWidth: 2 },
  ];
}

function Field({
  icon,
  label,
  error,
  children,
}: {
  icon: FieldIcon;
  label: string;
  error?: string | null;
  children: ReactNode;
}) {
  const tone = TONES[icon];
  return (
    <View style={styles.field}>
      <View style={[styles.fieldIcon, { backgroundColor: tone.background }]}>
        <Glyph name={icon} color={tone.tint} size={26} strokeWidth={2.2} />
      </View>
      <View style={styles.fieldBody}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {children}
        {error ? (
          <Text accessibilityRole="alert" style={styles.fieldError}>
            {error}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Bottom sheet with a scrollable list per column and a Done button. */
function PickerSheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityLabel="Close"
        style={styles.sheetBackdrop}
        onPress={onClose}
      />
      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <Pressable accessibilityRole="button" hitSlop={10} onPress={onClose}>
            <Text style={styles.sheetDone}>Done</Text>
          </Pressable>
        </View>
        {children}
      </SafeAreaView>
    </Modal>
  );
}

type PhotoAction = 'cancel' | 'remove' | 'gallery';

/**
 * Action sheet for the camera badge: a grouped list of actions with a
 * separate Cancel button, in the style of the system sheets.
 */
function PhotoOptionsSheet({
  visible,
  hasPhoto,
  onAction,
}: {
  visible: boolean;
  hasPhoto: boolean;
  onAction: (action: PhotoAction) => void;
}) {
  const actions: {
    action: Exclude<PhotoAction, 'cancel'>;
    label: string;
    icon: keyof typeof ICONS;
    tint: string;
    background: string;
    destructive?: boolean;
  }[] = [
    {
      action: 'gallery',
      label: 'Choose from gallery',
      icon: 'gallery',
      tint: '#2563eb',
      background: '#eaf1fe',
    },
    ...(hasPhoto
      ? [
          {
            action: 'remove' as const,
            label: 'Remove photo',
            icon: 'trash' as const,
            tint: '#dc2626',
            background: '#fdecec',
            destructive: true,
          },
        ]
      : []),
  ];
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => onAction('cancel')}
    >
      <Pressable
        accessibilityLabel="Close"
        style={styles.sheetBackdrop}
        onPress={() => onAction('cancel')}
      />
      <SafeAreaView edges={['bottom']} style={styles.actionSheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.actionTitle}>Profile photo</Text>
        <Text style={styles.actionSubtitle}>
          Shown on your profile and receipts.
        </Text>

        <View style={styles.actionGroup}>
          {actions.map((item, index) => (
            <Pressable
              key={item.action}
              accessibilityRole="button"
              onPress={() => onAction(item.action)}
              style={({ pressed }) => [
                styles.actionRow,
                index > 0 && styles.actionDivider,
                pressed && styles.actionPressed,
              ]}
            >
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: item.background },
                ]}
              >
                <Glyph name={item.icon} color={item.tint} size={18} />
              </View>
              <Text
                style={[
                  styles.actionLabel,
                  item.destructive && styles.actionLabelDestructive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => onAction('cancel')}
          style={({ pressed }) => [
            styles.actionCancel,
            pressed && styles.actionPressed,
          ]}
        >
          <Text style={styles.actionCancelText}>Cancel</Text>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}

function OptionList<T extends string | number>({
  options,
  selected,
  label,
  onSelect,
}: {
  options: readonly T[];
  selected: T | null;
  label?: (option: T) => string;
  onSelect: (option: T) => void;
}) {
  return (
    <ScrollView style={styles.optionList} nestedScrollEnabled>
      {options.map((option) => {
        const active = option === selected;
        return (
          <Pressable
            key={String(option)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(option)}
            style={[styles.option, active && styles.optionActive]}
          >
            <Text
              style={[styles.optionText, active && styles.optionTextActive]}
            >
              {label ? label(option) : String(option)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default function EditProfile() {
  const { wallet } = useAccount();
  const owner = profileOwner(wallet.account?.address);
  const saved = useMemo(
    () => (owner ? profileStore.get(owner) : null),
    [owner],
  );
  const [draft, setDraft] = useState<ProfileDetails | null>(saved);
  const [attempted, setAttempted] = useState(false);
  const [sheet, setSheet] = useState<'date' | 'country' | 'photo' | null>(null);
  const [focused, setFocused] = useState<FieldIcon | null>(null);
  const focusProps = (icon: FieldIcon) => ({
    onFocus: () => setFocused(icon),
    onBlur: () => setFocused((current) => (current === icon ? null : current)),
  });

  // Date picker columns; defaults to 1 January 2000 until a date is chosen.
  const now = new Date();
  const latestYear = now.getFullYear() - 13;
  const years = useMemo(
    () =>
      Array.from({ length: latestYear - 1930 + 1 }, (_, i) => latestYear - i),
    [latestYear],
  );
  const [y, m, d] = (draft?.dateOfBirth || '2000-01-01')
    .split('-')
    .map(Number) as [number, number, number];

  if (!owner || !draft || !saved) {
    return (
      <SafeAreaView style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.signedOut}>
          <Text style={styles.title}>Edit Profile</Text>
          <Text style={styles.signedOutCopy}>
            Connect your wallet to edit your profile.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const errors = profileErrors(draft);
  const valid = Object.values(errors).every((error) => !error);
  const changed = JSON.stringify(draft) !== JSON.stringify(saved);
  const shown = (key: keyof typeof errors, value: string) =>
    attempted || value ? errors[key] : null;
  const update = (patch: Partial<ProfileDetails>) =>
    setDraft((current) => (current ? { ...current, ...patch } : current));

  const setDate = (year: number, month: number, day: number) =>
    update({
      dateOfBirth: toIsoDate(
        year,
        month,
        Math.min(day, daysInMonth(year, month)),
      ),
    });

  // Gallery, then the phone's own crop screen (crop and rotate on Android,
  // square crop on iPhone) so the photo fits the round avatar.
  async function pickPhoto() {
    try {
      const picked = await launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      const uri = picked.canceled ? null : picked.assets[0]?.uri;
      if (uri) update({ photoUri: uri });
    } catch {
      Alert.alert('Profile photo', 'Could not open your gallery. Try again.');
    }
  }

  function save() {
    setAttempted(true);
    if (!valid || !owner || !draft) return;
    profileStore.save(owner, draft);
    if (router.canGoBack()) router.back();
    else router.replace('/profile');
  }

  // The picture is always the first letter of the first name.
  const initial = profileInitial(draft.name);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={8}
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace('/profile')
              }
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}
            >
              <Glyph name="chevronLeft" color={colors.ink} size={24} />
            </Pressable>
            <Text accessibilityRole="header" style={styles.title}>
              Edit Profile
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="See all profile settings"
              hitSlop={8}
              onPress={() => router.replace('/profile')}
              style={({ pressed }) => [
                styles.seeAll,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.seeAllText}>See All</Text>
              <Glyph name="chevronRight" size={20} />
            </Pressable>
          </View>

          <View style={styles.avatarArea}>
            <View style={styles.avatarHalo}>
              <View style={styles.avatarRing}>
                {draft.photoUri ? (
                  <Image
                    source={{ uri: draft.photoUri }}
                    accessibilityIgnoresInvertColors
                    style={styles.avatarImage}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatarFallback,
                      { backgroundColor: profileAvatarColor(draft.name) },
                    ]}
                  >
                    <Text style={styles.avatarInitial}>{initial}</Text>
                  </View>
                )}
              </View>
              {/* Camera badge on the ring's outer edge: opens the gallery. */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  draft.photoUri ? 'Change profile photo' : 'Add profile photo'
                }
                accessibilityHint="Opens your photo gallery"
                hitSlop={6}
                onPress={() => setSheet('photo')}
                style={({ pressed }) => [
                  styles.camera,
                  pressed && styles.pressed,
                ]}
              >
                <Glyph name="camera" color="#ffffff" size={22} />
              </Pressable>
            </View>
          </View>

          <Field
            icon="person"
            label="Full Name"
            error={shown('name', draft.name)}
          >
            <TextInput
              accessibilityLabel="Full name"
              value={draft.name}
              onChangeText={(name) => update({ name })}
              maxLength={NAME_MAX_LENGTH}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              placeholder="Your full name"
              placeholderTextColor="#9aa6ba"
              selectionColor={TONES.person.tint}
              {...focusProps('person')}
              style={inputStyle('person', focused === 'person')}
            />
          </Field>

          <Field
            icon="mail"
            label="Email Address"
            error={draft.emailVerified ? null : shown('email', draft.email)}
          >
            {draft.emailVerified ? (
              <Pressable
                accessibilityRole="text"
                accessibilityLabel={`Email ${draft.email}, verified, cannot be changed`}
                onPress={() =>
                  Alert.alert(
                    'Email address',
                    'Your verified email cannot be changed here.',
                  )
                }
                style={[...inputStyle('mail', false), styles.inputRow]}
              >
                <Text numberOfLines={1} style={styles.inputText}>
                  {draft.email}
                </Text>
                <Glyph name="lock" color="#7d8aa3" size={22} />
              </Pressable>
            ) : (
              <TextInput
                accessibilityLabel="Email address"
                value={draft.email}
                onChangeText={(email) => update({ email })}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                placeholder="name@example.com"
                placeholderTextColor="#9aa6ba"
                selectionColor={TONES.mail.tint}
                {...focusProps('mail')}
                style={inputStyle('mail', focused === 'mail')}
              />
            )}
          </Field>

          <Field
            icon="calendar"
            label="Date of Birth"
            error={shown('dateOfBirth', draft.dateOfBirth)}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Date of birth, ${formatDateOfBirth(draft.dateOfBirth) || 'not set'}`}
              onPress={() => setSheet('date')}
              style={[
                ...inputStyle('calendar', sheet === 'date'),
                styles.inputRow,
              ]}
            >
              <Text
                style={[
                  styles.inputText,
                  !draft.dateOfBirth && styles.placeholder,
                ]}
              >
                {formatDateOfBirth(draft.dateOfBirth) || 'Select date'}
              </Text>
              <Glyph name="chevronDown" color={TONES.calendar.tint} size={22} />
            </Pressable>
          </Field>

          <Field icon="pin" label="Country">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Country, ${draft.country}`}
              onPress={() => setSheet('country')}
              style={[
                ...inputStyle('pin', sheet === 'country'),
                styles.inputRow,
              ]}
            >
              <Text style={styles.inputText}>{draft.country}</Text>
              <Glyph name="chevronDown" color={TONES.pin.tint} size={22} />
            </Pressable>
          </Field>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !changed }}
            disabled={!changed}
            onPress={save}
            style={({ pressed }) => [
              styles.save,
              !changed && styles.saveDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.saveText}>Save Changes</Text>
            <View style={styles.saveArrow}>
              <Glyph name="arrow" color="#ffffff" size={24} />
            </View>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <PhotoOptionsSheet
        visible={sheet === 'photo'}
        hasPhoto={Boolean(draft.photoUri)}
        onAction={(action) => {
          setSheet(null);
          if (action === 'remove') update({ photoUri: null });
          // Let the sheet close before the gallery opens.
          if (action === 'gallery') setTimeout(() => void pickPhoto(), 350);
        }}
      />

      <PickerSheet
        visible={sheet === 'date'}
        title="Date of Birth"
        onClose={() => {
          if (!draft.dateOfBirth) setDate(y, m, d);
          setSheet(null);
        }}
      >
        <View style={styles.dateColumns}>
          <OptionList
            options={Array.from({ length: daysInMonth(y, m) }, (_, i) => i + 1)}
            selected={draft.dateOfBirth ? d : null}
            label={(day) => String(day).padStart(2, '0')}
            onSelect={(day) => setDate(y, m, day)}
          />
          <OptionList
            options={MONTH_NAMES.map((_, i) => i + 1)}
            selected={draft.dateOfBirth ? m : null}
            label={(month) => MONTH_NAMES[month - 1] ?? ''}
            onSelect={(month) => setDate(y, month, d)}
          />
          <OptionList
            options={years}
            selected={draft.dateOfBirth ? y : null}
            onSelect={(year) => setDate(year, m, d)}
          />
        </View>
      </PickerSheet>

      <PickerSheet
        visible={sheet === 'country'}
        title="Country"
        onClose={() => setSheet(null)}
      >
        <OptionList
          options={COUNTRIES}
          selected={draft.country as (typeof COUNTRIES)[number]}
          onSelect={(country) => {
            update({ country });
            setSheet(null);
          }}
        />
      </PickerSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#f5f8fd' },
  content: { paddingHorizontal: 20, paddingBottom: 20, gap: 18 },
  pressed: { opacity: 0.7 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    marginTop: 4,
  },
  back: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eef2f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#0b0f1f', fontSize: 24, fontWeight: '800' },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { color: BLUE, fontSize: 16, fontWeight: '600' },
  avatarArea: {
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  camera: {
    position: 'absolute',
    right: 4,
    bottom: 6,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    borderWidth: 3,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  avatarHalo: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRing: {
    width: 124,
    height: 124,
    borderRadius: 62,
    borderWidth: 4,
    borderColor: '#000000',
    overflow: 'hidden',
    backgroundColor: '#dce8fb',
    shadowColor: BLUE,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#ffffff', fontSize: 54, fontWeight: '500' },
  field: { flexDirection: 'row', alignItems: 'flex-end', gap: 14 },
  fieldIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  fieldBody: { flex: 1, gap: 6 },
  fieldLabel: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  fieldError: { color: '#a92c24', fontSize: 12 },
  input: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#dfe6f1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
    color: colors.ink,
    fontSize: 17,
    shadowColor: '#0b2a6b',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  inputText: { flex: 1, color: colors.ink, fontSize: 17 },
  placeholder: { color: '#9aa6ba' },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  save: {
    minHeight: 62,
    borderRadius: 31,
    backgroundColor: '#1565f0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1565f0',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  saveDisabled: { backgroundColor: '#8db2f3', shadowOpacity: 0 },
  saveText: { color: '#ffffff', fontSize: 19, fontWeight: '700' },
  // Just the arrow, with no circle or border around it.
  saveArrow: { position: 'absolute', right: 22 },
  signedOut: { flex: 1, padding: 24, gap: 12, justifyContent: 'center' },
  signedOutCopy: { color: colors.muted, fontSize: 15 },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(8,19,50,0.35)' },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#d5dbe5',
    marginBottom: 6,
  },
  actionSheet: {
    backgroundColor: '#f6f8fb',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  actionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  actionSubtitle: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 14,
  },
  actionGroup: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e7ef',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  actionDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e7ef',
  },
  actionPressed: { backgroundColor: '#eef2f8' },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  actionLabelDestructive: { color: '#dc2626' },
  actionCancel: {
    marginTop: 10,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e7ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCancelText: { color: '#2563eb', fontSize: 15, fontWeight: '700' },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  sheetTitle: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  sheetDone: { color: BLUE, fontSize: 17, fontWeight: '700' },
  dateColumns: { flexDirection: 'row', gap: 8 },
  optionList: { flex: 1, maxHeight: 300, marginBottom: 8 },
  option: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12 },
  optionActive: { backgroundColor: '#e6efff' },
  optionText: { color: colors.ink, fontSize: 16 },
  optionTextActive: { color: BLUE, fontWeight: '700' },
});
