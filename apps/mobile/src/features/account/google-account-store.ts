import { z } from 'zod';

/**
 * Who signed in with Google on this phone. A Google account lets a traveller
 * explore the app without a wallet; it never signs or approves payments.
 */
export const googleProfileSchema = z.object({
  sub: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(100),
  email: z.email().max(254),
  picture: z.url().max(500).optional(),
});

export type GoogleProfile = z.infer<typeof googleProfileSchema>;

export interface GoogleAccountStorage {
  get(): Promise<string | null>;
  set(value: string): Promise<void>;
  remove(): Promise<void>;
}

export function createGoogleAccountStore(storage: GoogleAccountStorage) {
  // undefined until the saved profile has been read.
  let cached: GoogleProfile | null | undefined;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  return {
    async load() {
      if (cached === undefined) {
        const saved = await storage.get().catch(() => null);
        let parsed: unknown = null;
        try {
          parsed = saved ? JSON.parse(saved) : null;
        } catch {
          /* A corrupt entry counts as signed out. */
        }
        const result = googleProfileSchema.safeParse(parsed);
        cached = result.success ? result.data : null;
        notify();
      }
      return cached;
    },
    /** Validates the profile before saving; throws if it is malformed. */
    async save(profile: unknown) {
      const valid = googleProfileSchema.parse(profile);
      await storage.set(JSON.stringify(valid));
      cached = valid;
      notify();
      return valid;
    },
    async clear() {
      await storage.remove();
      cached = null;
      notify();
    },
    /** The profile once loaded; undefined while still reading. */
    snapshot: () => cached,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
