import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Platform, Text, View } from 'react-native';

import { TUNABLES } from '@/config/tunables';
import { db } from '@/db/client';
import { settings, syncState } from '@/db/schema';
import { addDays, todayKey } from '@/domain/dates';
import { connectHealthConnect, grantedSummary, healthConnectStatus, inspectRecordCounts, openHealthConnectSettings, type RecordProbe } from '@/sources/healthConnect';
import { appleHealthStatus, connectAppleHealth, inspectAppleHealth } from '@/sources/appleHealth';
import { deleteGarminKey, GarminError, hasGarminKey, saveGarminKey, testGarminConnection } from '@/sources/garminApi';
import { keyExpiryNotice } from '@/sources/garminApiMapping';
import { PHONE_HEALTH } from '@/sources/phoneHealth';
import { backfillSync, GARMIN_KEY_EXPIRES_KEY, lastSyncAt, setSyncValue, syncNow } from '@/sync/syncService';
import { Body, Button, Card, Chips, Field, Screen, SectionLabel, Title } from '@/ui/components';
import { colors, font, space } from '@/ui/theme';

const SOURCE_OPTIONS = [
  { id: 'health_connect' as const, label: `Garmin via ${PHONE_HEALTH.name}` },
  { id: 'garmin_api' as const, label: 'Garmin (direct)' },
  { id: 'mock' as const, label: 'Demo data' },
];
type DataSource = (typeof SOURCE_OPTIONS)[number]['id'];

/** Health Connect and Apple Health connect and inspect differently. */
const IS_ANDROID = Platform.OS === 'android';

/** Connect Garmin data, choose demo data, sync, and inspect what the phone's health store holds. */
export default function HealthSettings() {
  const { data: rows } = useLiveQuery(db.select().from(settings).where(eq(settings.id, 1)));
  const current = rows[0];
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [counts, setCounts] = useState<RecordProbe[] | null>(null);
  const [permissions, setPermissions] = useState<{
    granted: string[];
    missing: string[];
  } | null>(null);

  const setSource = (dataSource: DataSource) => db.update(settings).set({ dataSource }).where(eq(settings.id, 1)).run();
  const direct = current?.dataSource === 'garmin_api';

  // Garmin (direct): the key lives in secure storage, its expiry date in the database.
  const { data: expiryRows } = useLiveQuery(db.select().from(syncState).where(eq(syncState.key, GARMIN_KEY_EXPIRES_KEY)));
  const savedExpiry = expiryRows[0]?.value || null;
  const [keySaved, setKeySaved] = useState<boolean | null>(null);
  const [keyText, setKeyText] = useState('');
  const [expiryText, setExpiryText] = useState('');
  // Shown inside the key card, so the answer appears next to the button that was tapped.
  const [keyStatus, setKeyStatus] = useState('');
  const keyNotice = keySaved ? keyExpiryNotice(savedExpiry, todayKey(), TUNABLES.garmin.keyWarningDays) : null;

  useEffect(() => {
    void hasGarminKey().then(setKeySaved);
  }, []);

  /**
   * Saves the key (or just a corrected expiry date), checks Garmin accepts it, then reads the first two months.
   * A newly pasted key that Garmin rejects is deleted again, so a mis-copied key is never left looking "saved".
   */
  const saveKey = async () => {
    const key = keyText.trim();
    const expires = expiryText.trim() || savedExpiry || addDays(todayKey(), TUNABLES.garmin.keyLifetimeDays);
    if (!key && !keySaved) return setKeyStatus('Paste your Garmin key first.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expires)) return setKeyStatus('Write the expiry date as YYYY-MM-DD, for example 2027-11-15.');

    setBusy(true);
    try {
      if (key) await saveGarminKey(key);
      setSyncValue(GARMIN_KEY_EXPIRES_KEY, expires);
      setKeySaved(true);
      setKeyText('');
      setExpiryText('');
      setKeyStatus('Saved. Checking with Garmin…');
      await testGarminConnection();
      setKeyStatus('Garmin accepted the key. Reading your data…');
      setKeyStatus((await syncNow(undefined, Date.now() - TUNABLES.sync.initialDays * 86400000)).message);
    } catch (error) {
      if (key && error instanceof GarminError && error.kind === 'bad_key') {
        await deleteGarminKey();
        setSyncValue(GARMIN_KEY_EXPIRES_KEY, '');
        setKeySaved(false);
        setKeyStatus('Garmin did not accept that key, so it was not saved. Check you copied all of it, or create a new one in Garmin Connect.');
      } else {
        setKeyStatus(error instanceof Error ? error.message : String(error));
      }
    } finally {
      setBusy(false);
    }
  };

  const testKey = async () => {
    setBusy(true);
    setKeyStatus('Checking with Garmin…');
    try {
      setKeyStatus(await testGarminConnection());
    } catch (error) {
      setKeyStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const removeKey = () =>
    Alert.alert('Remove the Garmin key?', 'The key is deleted from this phone. Data already synced stays. To stop the key working anywhere, also delete it in Garmin Connect.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteGarminKey();
          setSyncValue(GARMIN_KEY_EXPIRES_KEY, '');
          setKeySaved(false);
          setKeyStatus('Key removed.');
        },
      },
    ]);

  const connect = async () => (IS_ANDROID ? connectAndroid() : connectIos());

  /** Apple never reports which categories you allowed, so a finished permission sheet counts as connected. */
  const connectIos = async () => {
    setBusy(true);
    try {
      if ((await appleHealthStatus()) !== 'available') {
        Alert.alert('Apple Health not available', 'This device has no Apple Health. It is built into every iPhone.');
        return;
      }
      const { asked } = await connectAppleHealth();
      db.update(settings).set({ healthConnectConnected: asked, dataSource: 'health_connect' }).where(eq(settings.id, 1)).run();
      if (!asked) {
        setStatus('The permission sheet was dismissed. Tap Connect to try again.');
        return;
      }
      setStatus('Connected. Syncing…');
      setStatus((await syncNow()).message);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const connectAndroid = async () => {
    setBusy(true);
    try {
      const availability = await healthConnectStatus();
      if (availability !== 'available') {
        Alert.alert(
          'Health Connect not available',
          availability === 'needs_update'
            ? 'Update Health Connect from the Play Store, then try again.'
            : 'This phone has no Health Connect. It is built into Android 14 and later.',
        );
        return;
      }
      const result = await connectHealthConnect();
      setPermissions(result);
      const connected = result.missing.length < result.granted.length;
      db.update(settings)
        .set({
          healthConnectConnected: connected,
          dataSource: 'health_connect',
        })
        .where(eq(settings.id, 1))
        .run();
      setStatus(connected ? 'Connected. Syncing…' : 'No permissions granted.');
      if (connected) setStatus((await syncNow()).message);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const sync = async () => {
    setBusy(true);
    setStatus((await syncNow()).message);
    setBusy(false);
  };

  const backfill = () =>
    Alert.alert(
      'Re-read everything?',
      direct
        ? `Asks Garmin for the last ${Math.round(TUNABLES.sync.backfillDays / 30)} months instead of just the recent days, four weeks at a time. It needs an internet connection and takes a minute or two. Nothing is duplicated.`
        : `Asks ${PHONE_HEALTH.name} for the last ${Math.round(TUNABLES.sync.backfillDays / 30)} months instead of just the recent days, a month at a time. It only has what Garmin wrote into it, so this reaches back as far as that goes and no further. Nothing is duplicated.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Re-read',
          onPress: async () => {
            setBusy(true);
            setStatus((await backfillSync()).message);
            setBusy(false);
          },
        },
      ],
    );

  const inspect = async () => {
    setBusy(true);
    try {
      const now = Date.now();
      if (IS_ANDROID) {
        setPermissions(await grantedSummary());
        setCounts(await inspectRecordCounts(now - 7 * 86400000, now));
      } else {
        // Apple does not reveal granted permissions, so only the record counts are shown.
        setCounts(await inspectAppleHealth(now - 7 * 86400000, now));
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const last = lastSyncAt();

  return (
    <>
      <Stack.Screen options={{ title: `Garmin & ${PHONE_HEALTH.name}` }} />
      <Screen edges={['bottom']}>
        <Title
          subtitle={
            direct
              ? 'This app reads your Garmin Connect data straight from Garmin, over the internet. Nothing is written back.'
              : `Garmin Connect writes to ${PHONE_HEALTH.name}; this app reads from it. Nothing is written back.`
          }
        >
          Data source
        </Title>

        <Chips options={SOURCE_OPTIONS} selected={current ? [current.dataSource] : []} onToggle={setSource} />
        <View style={{ height: space.md }} />
        {current?.dataSource === 'mock' ? (
          <Body dim>Demo data is generated on the phone so every screen has something to show. Switch back to {PHONE_HEALTH.name} on your real phone.</Body>
        ) : null}

        {direct ? (
          <>
            <SectionLabel>Garmin key</SectionLabel>
            <Card>
              <Body>{keySaved === null ? 'Checking…' : keySaved ? `Key saved${savedExpiry ? `, expires ${savedExpiry}` : ''}` : 'No key saved'}</Body>
              {keyNotice ? <Text style={{ color: keyNotice.expired ? colors.danger : colors.warning, fontSize: font.body }}>{keyNotice.message}</Text> : null}
              <Body dim>
                Create a Personal API key in your Garmin Connect account on the web, copy it, and paste it here. It is kept in this phone's secure storage and nowhere else: not in
                backups, and it is only ever sent to Garmin. Unlike {PHONE_HEALTH.name}, this also brings VO2 max and HRV, but it needs an internet connection to sync.
              </Body>
              <Field label={keySaved ? 'Replace the key' : 'Key'} value={keyText} onChangeText={setKeyText} placeholder="Paste the key" secret />
              <Field
                label="Key expires"
                value={expiryText}
                onChangeText={setExpiryText}
                placeholder={savedExpiry ?? addDays(todayKey(), TUNABLES.garmin.keyLifetimeDays)}
                keyboardType="numbers-and-punctuation"
                hint={`The date Garmin showed when you created the key, as YYYY-MM-DD. Leave it empty for one year from today. You are warned ${TUNABLES.garmin.keyWarningDays} days before.`}
              />
              <Button label={busy ? 'Working…' : 'Save key'} onPress={saveKey} disabled={busy} />
              <Button variant="secondary" label="Test connection" onPress={testKey} disabled={busy || !keySaved} />
              {keySaved ? <Button variant="danger" label="Remove key" onPress={removeKey} disabled={busy} /> : null}
              {keyStatus ? <Body dim>{keyStatus}</Body> : null}
            </Card>
          </>
        ) : null}

        {current?.dataSource === 'health_connect' ? (
          <>
            <SectionLabel>{PHONE_HEALTH.name}</SectionLabel>
            <Card>
              <Body>{current?.healthConnectConnected ? 'Connected' : 'Not connected'}</Body>
              <Body dim>
                First, {PHONE_HEALTH.garminSetup.charAt(0).toLowerCase() + PHONE_HEALTH.garminSetup.slice(1)} {PHONE_HEALTH.appSetup}
              </Body>
              <Button label={current?.healthConnectConnected ? 'Re-check permissions' : 'Connect'} onPress={connect} disabled={busy} />
              {IS_ANDROID ? (
                <Button variant="secondary" label="Open Health Connect settings" onPress={() => openHealthConnectSettings()} />
              ) : (
                <Button variant="secondary" label="Open the Health app" onPress={() => void Linking.openURL('x-apple-health://').catch(() => undefined)} />
              )}
            </Card>
          </>
        ) : null}

        <SectionLabel>Sync</SectionLabel>
        <Card>
          <Body dim>Last sync: {last ? last.toLocaleString() : 'never'}</Body>
          <Button variant="secondary" label={busy ? 'Working…' : 'Sync now'} onPress={sync} disabled={busy} />
          <Button variant="secondary" label={busy ? 'Working…' : 'Re-read everything'} onPress={backfill} disabled={busy} />
          <Body dim>
            {direct
              ? 'Re-reading pulls a full year from Garmin. Run it once after saving the key, to fill in VO2 max and HRV history.'
              : `Pulls back as far as Garmin wrote into ${PHONE_HEALTH.name}. Run it once after connecting the watch, and after any update that adds a new metric.`}
          </Body>
          {status ? <Body dim>{status}</Body> : null}
        </Card>

        {current?.dataSource === 'health_connect' ? (
          <>
            <SectionLabel>Data inspector</SectionLabel>
            <Body dim>
              Records of each type in the last 7 days, to check what Garmin still shares (HRV and sleep stages may not be), and the oldest record it holds, which is the real limit on
              how much history this app can ever see.
            </Body>
            <View style={{ height: space.sm }} />
            <Button variant="secondary" label="Inspect last 7 days" onPress={inspect} disabled={busy} />
            {permissions ? (
              <Card style={{ marginTop: space.md }}>
                <Body>Granted: {permissions.granted.length ? permissions.granted.join(', ') : 'none'}</Body>
                {permissions.missing.length ? <Text style={{ color: colors.warning, fontSize: font.body }}>Missing: {permissions.missing.join(', ')}</Text> : null}
              </Card>
            ) : null}
            {counts?.map((c) => (
              <View
                key={c.type}
                style={{
                  paddingVertical: space.sm,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: font.body }}>{c.type}</Text>
                  <Text
                    style={{
                      color: c.count > 0 ? colors.accent : c.count < 0 ? colors.danger : colors.textDim,
                      fontSize: font.body,
                      flexShrink: 1,
                    }}
                    numberOfLines={1}
                  >
                    {c.count < 0 ? 'unreadable' : c.count === 0 ? 'none in 7 days' : `${c.count} in 7 days`}
                  </Text>
                </View>
                <Text style={{ color: colors.textDim, fontSize: font.small }} numberOfLines={2}>
                  {c.error
                    ? c.error
                    : `oldest ${c.earliest ? new Date(c.earliest).toLocaleDateString() : 'unknown'}${c.latest ? ` · newest ${new Date(c.latest).toLocaleDateString()}` : ''}`}
                </Text>
              </View>
            ))}
            {counts ? (
              <Body dim>
                If "oldest" is only about a month back, that is all Garmin backfilled when you connected. History grows forward from here, so it is worth leaving the watch connected.
              </Body>
            ) : null}
          </>
        ) : null}
      </Screen>
    </>
  );
}
