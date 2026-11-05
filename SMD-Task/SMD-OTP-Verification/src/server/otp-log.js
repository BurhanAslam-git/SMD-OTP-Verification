/**
 * Prints every OTP step in the laptop terminal running `npx expo start`.
 * That terminal is where the OTP is delivered, and these lines are the proof log.
 */
import { triesLeftText } from './otp-store';

const divider = '-'.repeat(60);

function now() {
  return new Date().toLocaleTimeString('en-GB', { hour12: false });
}

export function logOtpGenerated(phone, otp, minutes) {
  console.log(
    [
      '',
      divider,
      `  SMD OTP SERVER  |  ${now()}`,
      `  OTP GENERATED for ${phone}`,
      '',
      `      >>>  ${otp}  <<<`,
      '',
      `  Valid for ${minutes} minutes, one use only`,
      divider,
    ].join('\n'),
  );
}

export function logOtpEntered(phone, otp) {
  console.log(`[${now()}] OTP ENTERED   ${phone} typed ${otp}`);
}

export function logOtpResult(phone, result) {
  const time = `[${now()}]`;
  switch (result.status) {
    case 'verified':
      console.log(`${time} VERIFIED      ${phone}`);
      console.log(
        result.newUser
          ? `${time} REGISTERED    ${phone} as user ${result.userId} (total users: ${result.totalUsers})`
          : `${time} LOGGED IN     ${phone} is already registered as ${result.userId}`,
      );
      console.log(divider);
      break;
    case 'wrong':
      console.log(`${time} REJECTED      ${phone} wrong OTP (${triesLeftText(result.triesLeft)})`);
      break;
    case 'too_many_tries':
      console.log(`${time} BLOCKED       ${phone} too many wrong OTPs, a new one is needed`);
      break;
    case 'expired':
      console.log(`${time} EXPIRED       ${phone} OTP is older than its time limit`);
      break;
    default:
      console.log(`${time} NO OTP        ${phone} has no active OTP`);
  }
}
