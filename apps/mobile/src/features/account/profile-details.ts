/**
 * Personal details the user edits on the Edit Profile screen. They are kept on
 * this device only, one record per owner (the wallet address, or the UI
 * preview). Nothing is sent to a server.
 */
export type ProfileDetails = {
  name: string;
  /** A verified email cannot be changed in the app. */
  email: string;
  emailVerified: boolean;
  /** ISO date (YYYY-MM-DD), or empty when not set. */
  dateOfBirth: string;
  country: string;
  /**
   * Cropped photo chosen from the gallery (a local image URI), or null to show
   * the first letter of the first name instead.
   */
  photoUri: string | null;
};

export interface ProfileStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export const PROFILE_DETAILS_KEY = 'traveller.profile-details.v1';
export const PREVIEW_PROFILE_OWNER = 'ui-preview';

export const COUNTRIES = [
  'India',
  'United States',
  'United Kingdom',
  'United Arab Emirates',
  'Singapore',
  'Australia',
  'Canada',
  'Germany',
  'France',
  'Japan',
] as const;

export const NAME_MAX_LENGTH = 60;

/**
 * The first letter of the user's first name, shown as the profile picture
 * when no photo is chosen, e.g. "Rupesh Kumar" -> "R".
 */
export function profileInitial(name: string): string {
  const first = name.trim().split(/\s+/u)[0] ?? '';
  return Array.from(first)[0]?.toUpperCase() ?? '';
}

// Google Pay-style avatar colours: muted, with enough contrast for white text.
const AVATAR_COLORS = [
  '#7cb342', // green
  '#6d4c41', // brown
  '#d6537e', // pink
  '#5c6bc0', // indigo
  '#1e5aa8', // blue
  '#00897b', // teal
  '#e8710a', // orange
  '#8e24aa', // purple
  '#c0392b', // red
  '#546e7a', // blue grey
] as const;

/** The same name always gets the same avatar colour. */
export function profileAvatarColor(name: string): string {
  const key = name.trim().toLowerCase();
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]!;
}

export function emptyProfile(): ProfileDetails {
  return {
    name: '',
    email: '',
    emailVerified: false,
    dateOfBirth: '',
    country: 'India',
    photoUri: null,
  };
}

/** Sample identity for the UI preview; matches the Profile page. */
export function previewProfile(): ProfileDetails {
  return {
    ...emptyProfile(),
    name: 'Rupesh Kumar',
    email: 'rupesh@gmail.com',
    emailVerified: true,
  };
}

export function nameError(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Enter your full name.';
  if (trimmed.length > NAME_MAX_LENGTH)
    return `Use at most ${NAME_MAX_LENGTH} characters.`;
  // Control characters are not allowed in a display name.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/u.test(trimmed))
    return 'Remove special characters.';
  return null;
}

export function emailError(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(trimmed)
    ? null
    : 'Enter a valid email address.';
}

/** Optional; must be a real past date, at least 13 years ago. */
export function dateOfBirthError(iso: string, now = new Date()): string | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(iso);
  if (!match) return 'Choose a valid date.';
  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ];
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  )
    return 'Choose a valid date.';
  const minimum = new Date(
    now.getFullYear() - 13,
    now.getMonth(),
    now.getDate(),
  );
  if (date > minimum) return 'You must be at least 13 years old.';
  if (year < 1900) return 'Choose a valid date.';
  return null;
}

export function profileErrors(details: ProfileDetails) {
  return {
    name: nameError(details.name),
    email: details.emailVerified ? null : emailError(details.email),
    dateOfBirth: dateOfBirthError(details.dateOfBirth),
  };
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const MONTH_NAMES: readonly string[] = MONTHS;

/** "2006-06-09" -> "09 June 2006". */
export function formatDateOfBirth(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(iso);
  if (!match) return '';
  return `${match[3]} ${MONTHS[Number(match[2]) - 1] ?? ''} ${match[1]}`;
}

export function toIsoDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function isProfileDetails(value: unknown): value is ProfileDetails {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.name === 'string' &&
    typeof record.email === 'string' &&
    typeof record.emailVerified === 'boolean' &&
    typeof record.dateOfBirth === 'string' &&
    typeof record.country === 'string' &&
    (record.photoUri === undefined ||
      record.photoUri === null ||
      typeof record.photoUri === 'string')
  );
}

export function createProfileStore(storage?: ProfileStorage) {
  let profiles: Readonly<Record<string, ProfileDetails>> = {};
  const listeners = new Set<() => void>();
  function publish(next: Readonly<Record<string, ProfileDetails>>) {
    profiles = next;
    listeners.forEach((listener) => listener());
  }
  return {
    getSnapshot: () => profiles,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Loads saved details, keeping any saved before loading finished. */
    async hydrate() {
      if (!storage) return;
      try {
        const saved: unknown = JSON.parse(
          (await storage.getItem(PROFILE_DETAILS_KEY)) ?? '{}',
        );
        if (typeof saved !== 'object' || saved === null) return;
        const restored: Record<string, ProfileDetails> = {};
        for (const [owner, details] of Object.entries(saved)) {
          if (isProfileDetails(details) && !(owner in profiles))
            // Records saved before photos existed have no photoUri.
            restored[owner] = {
              ...details,
              photoUri: details.photoUri ?? null,
            };
        }
        if (Object.keys(restored).length) publish({ ...restored, ...profiles });
      } catch {
        // Unreadable storage only loses saved profile details.
      }
    },
    /** Saved details for an owner, or the starting details if none. */
    get(owner: string): ProfileDetails {
      return (
        profiles[owner] ??
        (owner === PREVIEW_PROFILE_OWNER ? previewProfile() : emptyProfile())
      );
    },
    save(owner: string, details: ProfileDetails) {
      const next = {
        ...details,
        name: details.name.trim(),
        email: details.email.trim(),
      };
      publish({ ...profiles, [owner]: next });
      void storage
        ?.setItem(PROFILE_DETAILS_KEY, JSON.stringify(profiles))
        .catch(() => undefined);
      return next;
    },
  };
}
