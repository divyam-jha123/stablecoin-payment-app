import { describe, expect, it } from 'vitest';
import {
  createProfileStore,
  dateOfBirthError,
  emailError,
  formatDateOfBirth,
  nameError,
  profileAvatarColor,
  profileInitial,
  PREVIEW_PROFILE_OWNER,
  PROFILE_DETAILS_KEY,
  type ProfileStorage,
} from './profile-details';

function memoryStorage(initial: Record<string, string> = {}): ProfileStorage {
  const data = { ...initial };
  return {
    getItem: async (key) => data[key] ?? null,
    setItem: async (key, value) => {
      data[key] = value;
    },
  };
}

describe('profile details validation', () => {
  it('requires a sensible name', () => {
    expect(nameError('  ')).toBe('Enter your full name.');
    expect(nameError('Rupesh Kumar')).toBeNull();
    expect(nameError('a'.repeat(61))).toMatch(/at most/);
  });

  it('checks the optional email format', () => {
    expect(emailError('')).toBeNull();
    expect(emailError('rupesh@gmail.com')).toBeNull();
    expect(emailError('rupesh@gmail')).not.toBeNull();
  });

  it('accepts real past dates only', () => {
    const now = new Date(2026, 9, 9);
    expect(dateOfBirthError('', now)).toBeNull();
    expect(dateOfBirthError('2006-06-09', now)).toBeNull();
    expect(dateOfBirthError('2006-02-30', now)).not.toBeNull();
    expect(dateOfBirthError('2020-01-01', now)).toMatch(/13/);
    expect(formatDateOfBirth('2006-06-09')).toBe('09 June 2006');
  });
});

describe('profile store', () => {
  it('starts the preview with the sample identity and saves edits', async () => {
    const storage = memoryStorage();
    const store = createProfileStore(storage);
    expect(store.get(PREVIEW_PROFILE_OWNER).name).toBe('Rupesh Kumar');
    expect(store.get('0xabc').name).toBe('');

    store.save('0xabc', { ...store.get('0xabc'), name: '  Asha  ' });
    expect(store.get('0xabc').name).toBe('Asha');

    const reloaded = createProfileStore(storage);
    await reloaded.hydrate();
    expect(reloaded.get('0xabc').name).toBe('Asha');
    expect(reloaded.get('0xabc').photoUri).toBeNull();
  });

  it('keeps a chosen photo and loads older records without one', async () => {
    const storage = memoryStorage({
      [PROFILE_DETAILS_KEY]: JSON.stringify({
        old: {
          name: 'Old',
          email: '',
          emailVerified: false,
          dateOfBirth: '',
          country: 'India',
        },
      }),
    });
    const store = createProfileStore(storage);
    await store.hydrate();
    expect(store.get('old').photoUri).toBeNull();
    store.save('old', { ...store.get('old'), photoUri: 'file:///photo.jpg' });
    const reloaded = createProfileStore(storage);
    await reloaded.hydrate();
    expect(reloaded.get('old').photoUri).toBe('file:///photo.jpg');
  });

  it('ignores unreadable saved data', async () => {
    const store = createProfileStore(
      memoryStorage({ [PROFILE_DETAILS_KEY]: '{"0xabc":{"name":1}}' }),
    );
    await store.hydrate();
    expect(store.get('0xabc').name).toBe('');
  });
});

describe('profile avatar', () => {
  it('uses the first letter of the first name and a stable colour', () => {
    expect(profileInitial('  rupesh kumar ')).toBe('R');
    expect(profileInitial('')).toBe('');
    expect(profileAvatarColor('Rupesh Kumar')).toBe(
      profileAvatarColor(' rupesh kumar'),
    );
    expect(profileAvatarColor('Rupesh Kumar')).toMatch(/^#[0-9a-f]{6}$/);
  });
});
