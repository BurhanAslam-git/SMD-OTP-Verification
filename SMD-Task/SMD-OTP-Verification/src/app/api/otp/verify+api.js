import { checkOtp, isValidPhone, triesLeftText } from '../../../server/otp-store';
import { logOtpEntered, logOtpResult } from '../../../server/otp-log';

const FAILURES = {
  wrong: (result) => [401, `Incorrect OTP. ${triesLeftText(result.triesLeft)}.`],
  too_many_tries: () => [429, 'Too many wrong attempts. Request a new OTP.'],
  expired: () => [410, 'This OTP has expired. Request a new OTP.'],
  no_otp: () => [404, 'No active OTP for this number. Request a new OTP.'],
};

/**
 * POST /api/otp/verify   body: { "phone": "+923001234567", "otp": "123456" }
 * Checks the OTP and registers the number when it is correct.
 */
export async function POST(request) {
  const body = (await request.json().catch(() => null)) || {};
  const phone = String(body.phone ?? '').trim();
  const otp = String(body.otp ?? '').trim();

  if (!isValidPhone(phone) || !/^\d{6}$/.test(otp)) {
    return Response.json(
      { error: 'Send a valid phone number and a 6-digit OTP.' },
      { status: 400 },
    );
  }

  logOtpEntered(phone, otp);
  const result = checkOtp(phone, otp);
  logOtpResult(phone, result);

  if (result.status === 'verified') {
    return Response.json({ verified: true, userId: result.userId, newUser: result.newUser });
  }

  const [status, error] = FAILURES[result.status](result);
  return Response.json({ verified: false, error }, { status });
}
