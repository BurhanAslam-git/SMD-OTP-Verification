import { createOtp, isValidPhone, OTP_LIFETIME_MINUTES } from '../../../server/otp-store';
import { logOtpGenerated } from '../../../server/otp-log';

/**
 * POST /api/otp/send   body: { "phone": "+923001234567" }
 * Generates a random 6-digit OTP and prints it in the server console.
 * The OTP itself is never sent back to the app.
 */
export async function POST(request) {
  const body = (await request.json().catch(() => null)) || {};
  const phone = String(body.phone ?? '').trim();

  if (!isValidPhone(phone)) {
    return Response.json(
      { error: 'Enter your number with country code, e.g. +923001234567' },
      { status: 400 },
    );
  }

  const otp = createOtp(phone);
  logOtpGenerated(phone, otp, OTP_LIFETIME_MINUTES);

  return Response.json({ sent: true, expiresInMinutes: OTP_LIFETIME_MINUTES });
}
