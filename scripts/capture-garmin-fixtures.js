/**
 * Saves sample responses from Garmin's Personal API, so the mappers in
 * src/sources/garminApiMapping.ts can be written and tested against real data.
 *
 *   node scripts/capture-garmin-fixtures.js            the last 28 days
 *   node scripts/capture-garmin-fixtures.js 14         the last 14 days
 *
 * The key is read from GARMIN_PERSONAL_API_KEY, or from the file Garmin's own CLI uses,
 * ~/.config/garmin/connect-personal-api-key. It is sent only to Garmin and is never printed or
 * saved. Neither is the bearer token it is swapped for.
 *
 * Each response is written twice:
 *   .garmin-capture/                    exactly as Garmin sent it. Git-ignored.
 *   src/sources/__fixtures__/garmin/    with names, account ids and locations removed. Committed.
 *
 * Read the fixtures before committing them. They still hold your heart rate, sleep and weight
 * numbers, and the names you gave activities, which is the point of a fixture.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const BASE_URL = 'https://personal.connectapi.garmin.com';
const TOKEN_PATH = '/personalapitoken-service/personal-api/personal-api-key/token';
const KEY_FILE = path.join(os.homedir(), '.config', 'garmin', 'connect-personal-api-key');

const ROOT = path.join(__dirname, '..');
const RAW_DIR = path.join(ROOT, '.garmin-capture');
const FIXTURE_DIR = path.join(ROOT, 'src', 'sources', '__fixtures__', 'garmin');

const PAGE_SIZE = 20;
const MAX_PAGES = 10;

function readKey() {
  const fromEnv = (process.env.GARMIN_PERSONAL_API_KEY ?? '').trim();
  if (fromEnv) return fromEnv;
  if (!fs.existsSync(KEY_FILE)) throw new Error(`No key found. Put it in ${KEY_FILE} or set GARMIN_PERSONAL_API_KEY.`);
  const key = fs.readFileSync(KEY_FILE, 'utf8').trim();
  if (!key) throw new Error(`${KEY_FILE} is empty.`);
  return key;
}

function dateKey(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return dateKey(date);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ───────────────────────────── removing personal details ─────────────────────────────

/** Keys whose values say who or where you are, rather than how the training went. */
const PERSONAL_KEY =
  /^(owner.*|user(profile)?(id|pk)|userid|profileid|displayname|fullname|username|email.*|.*latitude|.*longitude|locationname|deviceid|.*imageurl.*|userroles|.*uuid)$/i;

/** Real activity ids are swapped for made-up ones, the same one every time an id repeats. */
const fakeIds = new Map();
function fakeActivityId(real) {
  if (!fakeIds.has(real)) fakeIds.set(real, 9000000001 + fakeIds.size);
  return fakeIds.get(real);
}

function redact(value, key = '') {
  if (/^activityid$/i.test(key) && typeof value === 'number') return fakeActivityId(value);
  if (PERSONAL_KEY.test(key)) {
    if (typeof value === 'string') return 'redacted';
    if (typeof value === 'number') return 0;
    return null;
  }
  if (Array.isArray(value)) return value.map((item) => redact(item, key));
  if (value && typeof value === 'object') {
    // Garmin names an activity after where it started ("Springfield Running"). Drop the place.
    const { activityName: name, locationName: place } = value;
    const named = typeof name === 'string' && typeof place === 'string' && name.startsWith(`${place} `);
    const cleaned = named ? { ...value, activityName: name.slice(place.length + 1) } : value;
    return Object.fromEntries(Object.entries(cleaned).map(([k, v]) => [k, redact(v, k)]));
  }
  return value;
}

// ───────────────────────────── talking to Garmin ─────────────────────────────

/** One request. Returns the status and the body, parsed when it is JSON. Waits and retries on 429. */
async function request(method, urlPath, headers) {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(BASE_URL + urlPath, { method, headers });
    if (response.status === 429 && attempt < 4) {
      const wait = Number(response.headers.get('retry-after')) || attempt * 5;
      console.log(`  429 from Garmin, waiting ${wait}s`);
      await sleep(wait * 1000);
      continue;
    }
    const text = await response.text();
    let body = text;
    try {
      body = JSON.parse(text);
    } catch {
      // Not JSON: keep the text.
    }
    const limits = [...response.headers.entries()].filter(([name]) => /ratelimit|retry-after/i.test(name));
    return { status: response.status, body, limits };
  }
}

function describe(body) {
  if (Array.isArray(body)) return `array of ${body.length}`;
  if (body && typeof body === 'object') return `object with ${Object.keys(body).slice(0, 8).join(', ')}`;
  return `text, ${String(body).length} characters`;
}

function save(name, result) {
  const file = `${name}.json`;
  fs.writeFileSync(path.join(RAW_DIR, file), JSON.stringify(result.body, null, 2));
  if (result.status === 200) {
    fs.writeFileSync(path.join(FIXTURE_DIR, file), JSON.stringify(redact(result.body), null, 2) + '\n');
  }
  const limits = result.limits.length > 0 ? `  [${result.limits.map(([k, v]) => `${k}: ${v}`).join(', ')}]` : '';
  console.log(`${String(result.status).padEnd(4)} ${name.padEnd(22)} ${describe(result.body)}${limits}`);
}

/** The claims inside a JWT, without checking the signature. Used only to read the expiry. */
function tokenClaims(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

async function main() {
  const days = Number(process.argv[2] ?? 28);
  if (!Number.isInteger(days) || days < 1 || days > 28) throw new Error('Days must be a whole number from 1 to 28.');
  const start = daysAgo(days - 1);
  const end = daysAgo(0);

  fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  // What a wrong key looks like, so the app can tell "key revoked" from "no internet".
  const badKey = await request('POST', TOKEN_PATH, { Accept: '*/*', Authorization: 'ApiKey not-a-real-key' });
  fs.writeFileSync(path.join(FIXTURE_DIR, 'error-bad-key.json'), JSON.stringify(badKey, null, 2) + '\n');
  console.log(`${String(badKey.status).padEnd(4)} ${'error-bad-key'.padEnd(22)} ${describe(badKey.body)}`);

  const tokenResult = await request('POST', TOKEN_PATH, { Accept: '*/*', Authorization: `ApiKey ${readKey()}` });
  if (tokenResult.status !== 200 || typeof tokenResult.body !== 'string') {
    throw new Error(`Garmin refused the key: HTTP ${tokenResult.status} ${JSON.stringify(tokenResult.body).slice(0, 300)}`);
  }
  const token = tokenResult.body.trim();
  const claims = tokenClaims(token);
  if (claims) {
    fs.writeFileSync(path.join(RAW_DIR, 'token-claims.json'), JSON.stringify(claims, null, 2));
    const expires = typeof claims.exp === 'number' ? new Date(claims.exp * 1000).toString() : 'unknown';
    console.log(`200  token                  claims: ${Object.keys(claims).join(', ')}; expires ${expires}`);
  } else {
    console.log('200  token                  not a JWT, so no expiry can be read from it');
  }

  const auth = { Accept: 'application/json', Authorization: `Bearer ${token}` };
  const get = (urlPath) => request('GET', urlPath, auth);
  const range = `startDate=${start}&endDate=${end}`;

  // What a wrong or expired bearer token looks like.
  const badToken = await request('GET', `/usersummary-service/v2/dailysummaries?${range}`, {
    Accept: 'application/json',
    Authorization: 'Bearer not-a-real-token',
  });
  fs.writeFileSync(path.join(FIXTURE_DIR, 'error-bad-token.json'), JSON.stringify(badToken, null, 2) + '\n');
  console.log(`${String(badToken.status).padEnd(4)} ${'error-bad-token'.padEnd(22)} ${describe(badToken.body)}`);

  save('activity-types', await get('/activity-service/activity/activityTypes/simple'));

  // Activities come a page at a time. Keep going until a page comes back short.
  const activities = [];
  let lastPage = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    lastPage = await get(`/activitylist-service/activities/search/activities?${range}&start=${page * PAGE_SIZE}&limit=${PAGE_SIZE}`);
    if (lastPage.status !== 200 || !Array.isArray(lastPage.body)) break;
    activities.push(...lastPage.body);
    console.log(`     activities page ${page + 1}: ${lastPage.body.length}`);
    if (lastPage.body.length < PAGE_SIZE) break;
  }
  save('activities', activities.length > 0 || !lastPage ? { ...lastPage, status: 200, body: activities } : lastPage);

  save('sleep-summaries', await get(`/sleep-service/sleep/dailySleepSummariesByDate?${range}`));
  save('sleep-day', await get(`/sleep-service/sleep/dailySleep?date=${end}`));
  save('sleep-day-before', await get(`/sleep-service/sleep/dailySleep?date=${daysAgo(1)}`));
  save('daily-summaries', await get(`/usersummary-service/v2/dailysummaries?${range}`));
  save('steps', await get(`/usersummary-service/stats/steps/daily/${start}/${end}`));
  save('hrv-summaries', await get(`/hrv-service/hrv/daily/${start}/${end}`));
  save('hrv-day', await get(`/hrv-service/hrv/${end}`));
  save('vo2-max', await get(`/metrics-service/metrics/maxmet/daily/${start}/${end}`));
  save('weight', await get(`/weight-service/weight/range/${start}/${end}?includeAll=true`));
  // A full year, because the scale may not have synced inside the short window. It also shows
  // whether this endpoint accepts a long range.
  save('weight-year', await get(`/weight-service/weight/range/${daysAgo(364)}/${end}?includeAll=true`));

  console.log(`\nWindow ${start} to ${end}.`);
  console.log(`Raw responses:  ${path.relative(ROOT, RAW_DIR)}/  (git-ignored)`);
  console.log(`Fixtures:       ${path.relative(ROOT, FIXTURE_DIR)}/  (read them before committing)`);
}

main().catch((error) => {
  console.error(`\nCapture failed: ${error.message}`);
  process.exit(1);
});
