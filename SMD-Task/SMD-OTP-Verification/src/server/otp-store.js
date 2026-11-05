/**
 * OTP store for the app's own server.
 *
 * This code runs on the laptop inside `npx expo start` (Expo Router API routes),
 * never on the phone. OTPs are kept in memory and disappear when the server stops.
 */

export const OTP_LIFETIME_MINUTES = 5;
const MAX_WRONG_TRIES = 3;

// Stored on globalThis so the send and verify routes share the same data.
const store = (globalThis.__smdOtpStore ??= {
  pending: new Map(), // phone -> { otp, expiresAt, wrongTries }
  users: new Map(), // phone -> userId of every verified (registered) number
});

/** "1 try left" / "2 tries left" */
export function triesLeftText(count) {
  return `${count} ${count === 1 ? 'try' : 'tries'} left`;
}

/** International format, e.g. +923001234567 */
export function isValidPhone(phone) {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

/** Random 6-digit OTP (100000 to 999999), every value equally likely. */
function randomOtp() {
  const range = 900000;
  const limit = Math.floor(2 ** 32 / range) * range;
  const value = new Uint32Array(1);
  do {
    crypto.getRandomValues(value);
  } while (value[0] >= limit);
  return String(100000 + (value[0] % range));
}

/** Creates a new OTP for the number. Any older OTP for it stops working. */
export function createOtp(phone) {
  const otp = randomOtp();
  store.pending.set(phone, {
    otp,
    expiresAt: Date.now() + OTP_LIFETIME_MINUTES * 60 * 1000,
    wrongTries: 0,
  });
  return otp;
}

/**
 * Checks the OTP typed in the app. Returns one of:
 *   { status: 'verified', userId, newUser, totalUsers }
 *   { status: 'wrong', triesLeft }
 *   { status: 'expired' } | { status: 'no_otp' } | { status: 'too_many_tries' }
 */
export function checkOtp(phone, enteredOtp) {
  const entry = store.pending.get(phone);
  if (!entry) return { status: 'no_otp' };

  if (Date.now() > entry.expiresAt) {
    store.pending.delete(phone);
    return { status: 'expired' };
  }

  if (enteredOtp !== entry.otp) {
    entry.wrongTries += 1;
    if (entry.wrongTries >= MAX_WRONG_TRIES) {
      store.pending.delete(phone);
      return { status: 'too_many_tries' };
    }
    return { status: 'wrong', triesLeft: MAX_WRONG_TRIES - entry.wrongTries };
  }

  // Correct OTP: it is used up, and the number is registered.
  store.pending.delete(phone);
  const newUser = !store.users.has(phone);
  if (newUser) {
    store.users.set(phone, `SMD-${String(store.users.size + 1).padStart(4, '0')}`);
  }
  return { status: 'verified', userId: store.users.get(phone), newUser, totalUsers: store.users.size };
}
