/**
 * Garmin Connect, read directly over the internet with a Garmin Personal API key.
 *
 * You create the key yourself in Garmin Connect and paste it into Settings once. It is kept in
 * the phone's secure storage (Keychain on iOS, Keystore-encrypted preferences on Android) and
 * nowhere else: not in SQLite, so not in backups, and never in a log or an error message.
 *
 * Garmin does not take the key on each request. The key is swapped for a bearer token that lasts
 * about a day, and the token goes on the requests. The token is kept in secure storage too, and
 * replaced when it is close to running out or when Garmin stops accepting it.
 *
 * The endpoints are the ones Garmin's own client uses (github.com/garmin/connect-personal-api-python).
 * The API is read-only. Turning the JSON into this app's shapes is done in garminApiMapping.ts.
 */
import * as SecureStore from 'expo-secure-store';

import { TUNABLES } from '@/config/tunables';

import {
  dateWindows,
  mapActivities,
  mapDaily,
  mapSleep,
  mapWeights,
  tokenExpiryMs,
  type GarminActivity,
  type GarminDailySummaries,
  type GarminHrvSummaries,
  type GarminSleepSummary,
  type GarminVo2Entry,
  type GarminWeightRange,
} from './garminApiMapping';
import type { ActivitySource, SourceData } from './types';

const BASE_URL = 'https://personal.connectapi.garmin.com';
const TOKEN_PATH = '/personalapitoken-service/personal-api/personal-api-key/token';

const KEY_ITEM = 'garmin.apiKey';
const TOKEN_ITEM = 'garmin.bearerToken';

/** On iOS, lets the early-morning background sync read the key while the phone is locked. */
const STORE_OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };

export type GarminErrorKind = 'no_key' | 'bad_key' | 'offline' | 'busy' | 'server';

/** A Garmin failure whose message is written for the person using the app and is shown as it is. */
export class GarminError extends Error {
  kind: GarminErrorKind;

  constructor(kind: GarminErrorKind, message: string) {
    super(message);
    this.name = 'GarminError';
    this.kind = kind;
  }
}

const NO_KEY = 'No Garmin key is saved. Add one in Settings → Garmin.';
const BAD_KEY = 'Garmin did not accept your key. It has expired or been revoked. Create a new one in Garmin Connect and paste it in Settings → Garmin.';
const OFFLINE = 'Could not reach Garmin. Check your internet connection and try again.';
const BUSY = 'Garmin is limiting requests right now. Try again in a few minutes.';
const serverError = (status: number) => `Garmin returned an error (HTTP ${status}). Try again later.`;

// ───────────────────────────── the key ─────────────────────────────

interface SavedToken {
  token: string;
  /** Epoch ms. */
  expiresAt: number;
}

/** The token for this run of the app, so secure storage is read once rather than on every request. */
let memoryToken: SavedToken | null = null;

async function forgetToken(): Promise<void> {
  memoryToken = null;
  await SecureStore.deleteItemAsync(TOKEN_ITEM, STORE_OPTIONS);
}

/** Saves a new key and drops the token that belonged to the old one. */
export async function saveGarminKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_ITEM, key.trim(), STORE_OPTIONS);
  await forgetToken();
}

export async function deleteGarminKey(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_ITEM, STORE_OPTIONS);
  await forgetToken();
}

export async function hasGarminKey(): Promise<boolean> {
  return Boolean(await SecureStore.getItemAsync(KEY_ITEM, STORE_OPTIONS));
}

// ───────────────────────────── requests ─────────────────────────────

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** One request to Garmin. Waits and retries on "too many requests"; gives up after a timeout. */
async function send(method: 'GET' | 'POST', path: string, headers: Record<string, string>): Promise<Response> {
  const t = TUNABLES.garmin;
  for (let attempt = 0; ; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), t.timeoutSec * 1000);
    let response: Response;
    try {
      response = await fetch(BASE_URL + path, { method, headers, signal: controller.signal });
    } catch {
      throw new GarminError('offline', OFFLINE);
    } finally {
      clearTimeout(timer);
    }

    if (response.status !== 429) return response;
    if (attempt >= t.retries) throw new GarminError('busy', BUSY);
    const asked = Number(response.headers.get('retry-after'));
    await wait(Math.min(asked > 0 ? asked : t.retryWaitSec * 2 ** attempt, t.maxRetryWaitSec) * 1000);
  }
}

/** Swaps the key for a bearer token. Garmin answers with the token as plain text. */
async function requestToken(key: string): Promise<SavedToken> {
  const response = await send('POST', TOKEN_PATH, { Accept: '*/*', Authorization: `ApiKey ${key}` });
  if (response.status === 401 || response.status === 403) throw new GarminError('bad_key', BAD_KEY);
  if (!response.ok) throw new GarminError('server', serverError(response.status));

  const token = (await response.text()).trim();
  const expiresAt = tokenExpiryMs(token);
  if (expiresAt === null) throw new GarminError('server', 'Garmin sent back a token this app could not read. Try again later.');
  return { token, expiresAt };
}

async function savedToken(): Promise<SavedToken | null> {
  if (memoryToken) return memoryToken;
  try {
    const text = await SecureStore.getItemAsync(TOKEN_ITEM, STORE_OPTIONS);
    memoryToken = text ? (JSON.parse(text) as SavedToken) : null;
  } catch {
    memoryToken = null;
  }
  return memoryToken;
}

/** A token with enough life left, from memory, secure storage, or Garmin, in that order. */
async function bearerToken(forceNew = false): Promise<string> {
  if (!forceNew) {
    const saved = await savedToken();
    if (saved && saved.expiresAt - Date.now() > TUNABLES.garmin.tokenRefreshMarginMin * 60000) return saved.token;
  }

  const key = await SecureStore.getItemAsync(KEY_ITEM, STORE_OPTIONS);
  if (!key) throw new GarminError('no_key', NO_KEY);

  const fresh = await requestToken(key);
  memoryToken = fresh;
  try {
    await SecureStore.setItemAsync(TOKEN_ITEM, JSON.stringify(fresh), STORE_OPTIONS);
  } catch {
    // Some keychains refuse long values. The token still works until the app closes.
  }
  return fresh.token;
}

/** A GET that returns parsed JSON, or null for an empty answer. Gets a new token once if the old one is refused. */
async function get<T>(path: string): Promise<T | null> {
  const withToken = async (forceNew: boolean) => send('GET', path, { Accept: 'application/json', Authorization: `Bearer ${await bearerToken(forceNew)}` });

  let response = await withToken(false);
  if (response.status === 401) response = await withToken(true);
  if (!response.ok) throw new GarminError('server', serverError(response.status));

  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new GarminError('server', 'Garmin sent back something this app could not read. Try again later.');
  }
}

/**
 * Checks the saved key end to end: a new token, then one small request. Returns a message to
 * show, and throws a GarminError with its own message when something is wrong.
 */
export async function testGarminConnection(): Promise<string> {
  await bearerToken(true);
  const [today] = dateWindows(Date.now(), Date.now(), 1);
  const summaries = await get<GarminDailySummaries>(`/usersummary-service/v2/dailysummaries?startDate=${today.start}&endDate=${today.end}`);
  return summaries?.data?.length ? 'Connected. Garmin accepted the key and sent today’s numbers.' : 'Connected. Garmin accepted the key, but has no numbers for today yet.';
}

// ───────────────────────────── the source ─────────────────────────────

export const garminApiSource: ActivitySource = {
  id: 'garmin_api',

  /**
   * Reads a window at a time, one request after another, because Garmin's range endpoints refuse
   * long ranges and it publishes no rate limits. A usual sync is one window; "Re-read everything"
   * is about thirteen.
   */
  async read(fromMs, toMs): Promise<SourceData> {
    const t = TUNABLES.garmin;
    const data: SourceData = { activities: [], sleep: [], daily: [], weights: [] };
    const windows = dateWindows(fromMs, toMs, t.windowDays);
    if (windows.length === 0) return data;

    for (const w of windows) {
      const range = `startDate=${w.start}&endDate=${w.end}`;

      // Activities come a page at a time; a short page is the last one.
      for (let start = 0; ; start += t.pageSize) {
        const page = await get<GarminActivity[]>(`/activitylist-service/activities/search/activities?${range}&start=${start}&limit=${t.pageSize}`);
        data.activities.push(...mapActivities(page));
        if (!Array.isArray(page) || page.length < t.pageSize) break;
      }

      data.sleep.push(...mapSleep(await get<GarminSleepSummary[]>(`/sleep-service/sleep/dailySleepSummariesByDate?${range}`)));

      const summaries = await get<GarminDailySummaries>(`/usersummary-service/v2/dailysummaries?${range}`);
      const hrv = await get<GarminHrvSummaries>(`/hrv-service/hrv/daily/${w.start}/${w.end}`);
      const vo2 = await get<GarminVo2Entry[]>(`/metrics-service/metrics/maxmet/daily/${w.start}/${w.end}`);
      data.daily.push(...mapDaily({ summaries, hrv, vo2 }));
    }

    // Weight takes a long range in one request (a year was tested), so it is asked for once.
    const first = windows[0].start;
    const last = windows[windows.length - 1].end;
    data.weights = mapWeights(await get<GarminWeightRange>(`/weight-service/weight/range/${first}/${last}?includeAll=true`));

    return data;
  },
};
