/**
 * The phone's own health store, whichever platform this is: Health Connect on Android, Apple
 * Health on iOS. Garmin Connect writes into it and this app reads from it.
 *
 * Settings stores the choice as `dataSource: 'health_connect'` and `healthConnectConnected`.
 * Those names predate iOS; read them as "the phone's health store" and "connected to it". Keeping
 * one value for both platforms also means a backup made on one phone restores on the other.
 */
import { Platform } from 'react-native';

export interface PhoneHealth {
  /** "Health Connect" or "Apple Health". */
  name: string;
  /** How to turn on sharing inside the Garmin Connect app on this platform. */
  garminSetup: string;
  /** How to grant this app access once Garmin is sharing. */
  appSetup: string;
  /** What to expect for VO2 max, which Garmin does not share with Health Connect. */
  vo2Note: string;
}

const ANDROID: PhoneHealth = {
  name: 'Health Connect',
  garminSetup: 'In Garmin Connect: More → Settings → Connected Apps → Health Connect → allow everything.',
  appSetup: 'Then tap Connect and allow all the read permissions, including background access and history.',
  // Confirmed on a Galaxy S24 Ultra in September 2026: Health Connect held no VO2 max record at
  // any date, while heart rate, sleep, steps and resting heart rate all went back months.
  vo2Note: 'Garmin does not share VO2 max with Health Connect, so it cannot arrive on its own. Enter it by hand from Garmin Connect (Performance Stats → VO2 Max).',
};

const IOS: PhoneHealth = {
  name: 'Apple Health',
  garminSetup: 'In Garmin Connect: More → Settings → Connected Apps → Apple Health → turn on every category.',
  appSetup: 'Then tap Connect and turn on every category this app asks to read. Apple never tells an app which ones you allowed, so if something is missing later, open the Health app → your profile picture → Apps → Headroom.',
  // Garmin withholds VO2 max on Android; whether it shares it with Apple Health is unconfirmed.
  vo2Note: 'Garmin may not share VO2 max with Apple Health. If nothing appears after a few runs, enter it by hand from Garmin Connect (Performance Stats → VO2 Max).',
};

export const PHONE_HEALTH: PhoneHealth = Platform.OS === 'ios' ? IOS : ANDROID;
