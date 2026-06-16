/**
 * In-memory brute-force protection per email address.
 *
 * After `maxAttempts` failed login attempts the email is locked for
 * `lockoutDurationMs`.  The counter resets on successful login.
 *
 * This is intentionally in-memory so it survives no longer than the
 * process — an acceptable trade-off for a single-instance deployment.
 * For multi-instance setups, move the store to Redis.
 */

const maxAttempts = 5;
const lockoutDurationMs = 15 * 60 * 1000;

interface LoginRecord {
  attempts: number;
  lockedUntil: number | null;
}

const store = new Map<string, LoginRecord>();

/** Check whether the email is currently locked out. */
export function isLoginLocked(email: string): boolean {
  const record = store.get(email);

  if (!record?.lockedUntil) {
    return false;
  }

  if (Date.now() >= record.lockedUntil) {
    store.delete(email);
    return false;
  }

  return true;
}

/** Record a failed login attempt.  Locks the email after `maxAttempts`. */
export function recordFailedLogin(email: string): void {
  const record = store.get(email) ?? { attempts: 0, lockedUntil: null };
  record.attempts += 1;

  if (record.attempts >= maxAttempts) {
    record.lockedUntil = Date.now() + lockoutDurationMs;
  }

  store.set(email, record);
}

/** Clear failed attempts on successful login. */
export function clearLoginAttempts(email: string): void {
  store.delete(email);
}
