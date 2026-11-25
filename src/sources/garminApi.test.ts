import activities from './__fixtures__/garmin/activities.json';
import dailySummaries from './__fixtures__/garmin/daily-summaries.json';
import badKey from './__fixtures__/garmin/error-bad-key.json';
import badToken from './__fixtures__/garmin/error-bad-token.json';
import hrvSummaries from './__fixtures__/garmin/hrv-summaries.json';
import sleepSummaries from './__fixtures__/garmin/sleep-summaries.json';
import vo2Max from './__fixtures__/garmin/vo2-max.json';
import weightYear from './__fixtures__/garmin/weight-year.json';
import { deleteGarminKey, GarminError, garminApiSource, hasGarminKey, saveGarminKey, testGarminConnection } from './garminApi';

// Secure storage is native. An in-memory map stands in for it.
jest.mock('expo-secure-store', () => {
  const items = new Map<string, string>();
  return {
    AFTER_FIRST_UNLOCK: 1,
    getItemAsync: jest.fn(async (key: string) => items.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => void items.set(key, value)),
    deleteItemAsync: jest.fn(async (key: string) => void items.delete(key)),
  };
});

const KEY = 'test-key-123';
const HOST = 'https://personal.connectapi.garmin.com';
const TOKEN_PATH = '/personalapitoken-service/personal-api/personal-api-key/token';

/** A token shaped like Garmin's, expiring `minutes` from now. */
function jwt(minutes: number, label = 'a'): string {
  const claims = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + minutes * 60, jti: label }));
  return `header.${claims.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}.signature`;
}

interface Reply {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

interface Call {
  method: string;
  path: string;
  auth: string;
}

let calls: Call[] = [];
/** Decides Garmin's answer to each request. Replaced per test. */
let answer: (call: Call, index: number) => Reply = () => ({ status: 500 });

const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();
const gets = (part: string) => calls.filter((c) => c.method === 'GET' && c.path.includes(part));
const tokenRequests = () => calls.filter((c) => c.path === TOKEN_PATH);

/** A Garmin that accepts the key and serves the captured responses. */
function fixtures(call: Call, token = jwt(24 * 60)): Reply {
  if (call.path === TOKEN_PATH) return call.auth === `ApiKey ${KEY}` ? { status: 200, body: token } : { status: badKey.status, body: badKey.body };
  if (!call.auth.startsWith('Bearer header.')) return { status: badToken.status, body: badToken.body };
  if (call.path.includes('/activities/search/activities')) return { status: 200, body: call.path.includes('start=0&') ? activities : [] };
  if (call.path.includes('dailySleepSummariesByDate')) return { status: 200, body: sleepSummaries };
  if (call.path.includes('dailysummaries')) return { status: 200, body: dailySummaries };
  if (call.path.includes('/hrv-service/')) return { status: 200, body: hrvSummaries };
  if (call.path.includes('/maxmet/')) return { status: 200, body: vo2Max };
  if (call.path.includes('/weight-service/')) return { status: 200, body: weightYear };
  return { status: 404 };
}

beforeEach(async () => {
  calls = [];
  answer = (call) => fixtures(call);
  await deleteGarminKey();
  globalThis.fetch = jest.fn(async (url: string, init: { method: string; headers: Record<string, string> }) => {
    const call = { method: init.method, path: String(url).replace(HOST, ''), auth: init.headers.Authorization };
    calls.push(call);
    const { status, body = '', headers = {} } = answer(call, calls.length - 1);
    return {
      status,
      ok: status >= 200 && status < 300,
      headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
      text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    };
  }) as unknown as typeof fetch;
});

afterEach(() => jest.useRealTimers());

describe('the saved key', () => {
  it('is remembered, trimmed, and can be removed', async () => {
    expect(await hasGarminKey()).toBe(false);
    await saveGarminKey(`  ${KEY}\n`);
    expect(await hasGarminKey()).toBe(true);
    await garminApiSource.read(at(2026, 11, 10), at(2026, 11, 15));
    expect(tokenRequests()[0].auth).toBe(`ApiKey ${KEY}`);
    await deleteGarminKey();
    expect(await hasGarminKey()).toBe(false);
  });

  it('fails with a message that says to add one when none is saved, without calling Garmin', async () => {
    await expect(garminApiSource.read(at(2026, 11, 10), at(2026, 11, 15))).rejects.toMatchObject({ kind: 'no_key', message: expect.stringContaining('No Garmin key is saved') });
    expect(calls).toHaveLength(0);
  });
});

describe('reading', () => {
  beforeEach(() => saveGarminKey(KEY));

  it('maps a window of captured responses', async () => {
    const data = await garminApiSource.read(at(2026, 10, 19), at(2026, 11, 15));
    expect(data.activities.map((a) => a.type)).toEqual(['run', 'run', 'run', 'cycling', 'walk']);
    expect(data.sleep).toHaveLength(28);
    expect(data.daily).toHaveLength(28);
    expect(data.daily.find((d) => d.date === '2026-11-14')?.vo2Max).toBe(46.9);
    expect(data.weights).toHaveLength(5);
  });

  it('sends the key once, to the token endpoint only, and the token everywhere else', async () => {
    await garminApiSource.read(at(2026, 10, 19), at(2026, 11, 15));
    expect(tokenRequests()).toHaveLength(1);
    expect(calls[0]).toMatchObject({ method: 'POST', path: TOKEN_PATH, auth: `ApiKey ${KEY}` });
    const rest = calls.slice(1);
    expect(rest.length).toBeGreaterThan(0);
    for (const call of rest) {
      expect(call.method).toBe('GET');
      expect(call.auth).toMatch(/^Bearer header\./);
      expect(call.path).not.toContain(KEY);
    }
  });

  it('asks for dates in the window, both ends included', async () => {
    await garminApiSource.read(at(2026, 10, 19), at(2026, 11, 15));
    expect(gets('dailySleepSummariesByDate')[0].path).toBe('/sleep-service/sleep/dailySleepSummariesByDate?startDate=2026-10-19&endDate=2026-11-15');
    expect(gets('/hrv-service/')[0].path).toBe('/hrv-service/hrv/daily/2026-10-19/2026-11-15');
    expect(gets('/maxmet/')[0].path).toBe('/metrics-service/metrics/maxmet/daily/2026-10-19/2026-11-15');
    expect(gets('/weight-service/')[0].path).toBe('/weight-service/weight/range/2026-10-19/2026-11-15?includeAll=true');
  });

  it('splits a long range into windows of 28 days, but asks for weight once', async () => {
    await garminApiSource.read(at(2026, 9, 1), at(2026, 11, 15));
    expect(gets('dailysummaries').map((c) => c.path.split('?')[1])).toEqual([
      'startDate=2026-09-01&endDate=2026-09-28',
      'startDate=2026-09-29&endDate=2026-10-26',
      'startDate=2026-10-27&endDate=2026-11-15',
    ]);
    expect(gets('dailySleepSummariesByDate')).toHaveLength(3);
    expect(gets('/hrv-service/')).toHaveLength(3);
    expect(gets('/maxmet/')).toHaveLength(3);
    expect(gets('/weight-service/').map((c) => c.path)).toEqual(['/weight-service/weight/range/2026-09-01/2026-11-15?includeAll=true']);
  });

  it('keeps asking for activities until a page comes back short', async () => {
    const page = (from: number, count: number) => Array.from({ length: count }, (_, i) => ({ ...activities[0], activityId: from + i }));
    answer = (call) => {
      if (!call.path.includes('/activities/search/activities')) return fixtures(call);
      if (call.path.includes('start=0&')) return { status: 200, body: page(100, 20) };
      if (call.path.includes('start=20&')) return { status: 200, body: page(200, 20) };
      return { status: 200, body: page(300, 3) };
    };
    const data = await garminApiSource.read(at(2026, 11, 10), at(2026, 11, 15));
    expect(gets('/activities/search/activities').map((c) => c.path.split('&').slice(2).join('&'))).toEqual(['start=0&limit=20', 'start=20&limit=20', 'start=40&limit=20']);
    expect(data.activities).toHaveLength(43);
  });

  it('treats an empty answer as no data', async () => {
    answer = (call) => (call.path.includes('/hrv-service/') ? { status: 204 } : fixtures(call));
    const data = await garminApiSource.read(at(2026, 10, 19), at(2026, 11, 15));
    expect(data.daily).toHaveLength(28);
    expect(data.daily.every((d) => d.hrvRmssd === null)).toBe(true);
  });
});

describe('the bearer token', () => {
  beforeEach(() => saveGarminKey(KEY));

  it('is reused by the next sync', async () => {
    await garminApiSource.read(at(2026, 11, 10), at(2026, 11, 15));
    await garminApiSource.read(at(2026, 11, 10), at(2026, 11, 15));
    expect(tokenRequests()).toHaveLength(1);
  });

  it('is replaced when it has under an hour left', async () => {
    answer = (call) => fixtures(call, jwt(30));
    await garminApiSource.read(at(2026, 11, 10), at(2026, 11, 15));
    calls = [];
    await garminApiSource.read(at(2026, 11, 10), at(2026, 11, 15));
    expect(tokenRequests().length).toBeGreaterThan(0);
  });

  it('is replaced once, and the request repeated, when Garmin refuses it', async () => {
    let refused = false;
    answer = (call) => {
      if (call.method === 'GET' && !refused) {
        refused = true;
        return { status: badToken.status, body: badToken.body };
      }
      return fixtures(call, jwt(24 * 60, refused ? 'second' : 'first'));
    };
    const data = await garminApiSource.read(at(2026, 11, 10), at(2026, 11, 15));
    expect(tokenRequests()).toHaveLength(2);
    expect(calls[1].path).toBe(calls[3].path);
    expect(calls[1].auth).not.toBe(calls[3].auth);
    expect(data.activities).toHaveLength(5);
  });

  it('is dropped when a new key is saved', async () => {
    await garminApiSource.read(at(2026, 11, 10), at(2026, 11, 15));
    await saveGarminKey('another-key');
    await expect(garminApiSource.read(at(2026, 11, 10), at(2026, 11, 15))).rejects.toMatchObject({ kind: 'bad_key' });
    expect(tokenRequests()[1].auth).toBe('ApiKey another-key');
  });
});

describe('when something is wrong', () => {
  beforeEach(() => saveGarminKey(KEY));

  it('says the key has expired or been revoked when Garmin rejects it', async () => {
    answer = () => ({ status: badKey.status, body: badKey.body });
    const error: GarminError = await garminApiSource.read(at(2026, 11, 10), at(2026, 11, 15)).catch((e) => e);
    expect(error).toBeInstanceOf(GarminError);
    expect(error.kind).toBe('bad_key');
    expect(error.message).toContain('expired or been revoked');
    expect(error.message).not.toContain(KEY);
    expect(calls).toHaveLength(1);
  });

  it('says to check the connection when Garmin cannot be reached', async () => {
    (globalThis.fetch as jest.Mock).mockRejectedValue(new TypeError('Network request failed'));
    await expect(garminApiSource.read(at(2026, 11, 10), at(2026, 11, 15))).rejects.toMatchObject({ kind: 'offline', message: expect.stringContaining('internet connection') });
  });

  it('reports a server error with its status', async () => {
    answer = (call) => (call.method === 'GET' ? { status: 503 } : fixtures(call));
    await expect(garminApiSource.read(at(2026, 11, 10), at(2026, 11, 15))).rejects.toMatchObject({ kind: 'server', message: expect.stringContaining('HTTP 503') });
  });

  it('waits and tries again when Garmin says too many requests', async () => {
    jest.useFakeTimers();
    let limited = 2;
    answer = (call) => {
      if (call.path.includes('dailysummaries') && limited > 0) {
        limited -= 1;
        return { status: 429, headers: { 'retry-after': '2' } };
      }
      return fixtures(call);
    };
    const reading = garminApiSource.read(at(2026, 11, 10), at(2026, 11, 15));
    await jest.runAllTimersAsync();
    expect((await reading).daily).toHaveLength(28);
    expect(gets('dailysummaries')).toHaveLength(3);
  });

  it('gives up after a few tries rather than waiting forever', async () => {
    jest.useFakeTimers();
    answer = (call) => (call.method === 'GET' ? { status: 429 } : fixtures(call));
    const reading = expect(garminApiSource.read(at(2026, 11, 10), at(2026, 11, 15))).rejects.toMatchObject({ kind: 'busy' });
    await jest.runAllTimersAsync();
    await reading;
    expect(calls.filter((c) => c.method === 'GET')).toHaveLength(4);
  });
});

describe('testGarminConnection', () => {
  it('gets a fresh token and makes one small request', async () => {
    await saveGarminKey(KEY);
    await garminApiSource.read(at(2026, 11, 10), at(2026, 11, 15));
    calls = [];
    expect(await testGarminConnection()).toContain('Connected');
    expect(calls.map((c) => c.method)).toEqual(['POST', 'GET']);
  });

  it('passes on why it failed', async () => {
    await saveGarminKey('wrong-key');
    await expect(testGarminConnection()).rejects.toMatchObject({ kind: 'bad_key' });
  });
});
