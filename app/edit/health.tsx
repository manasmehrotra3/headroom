import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Platform, Text, View } from 'react-native';

import { TUNABLES } from '@/config/tunables';
import { db } from '@/db/client';
import { settings } from '@/db/schema';
import { connectHealthConnect, grantedSummary, healthConnectStatus, inspectRecordCounts, openHealthConnectSettings, type RecordProbe } from '@/sources/healthConnect';
import { appleHealthStatus, connectAppleHealth, inspectAppleHealth } from '@/sources/appleHealth';
import { PHONE_HEALTH } from '@/sources/phoneHealth';
import { backfillSync, lastSyncAt, syncNow } from '@/sync/syncService';
import { Body, Button, Card, Chips, Screen, SectionLabel, Title } from '@/ui/components';
import { colors, font, space } from '@/ui/theme';

const SOURCE_OPTIONS = [
  { id: 'health_connect' as const, label: `Garmin via ${PHONE_HEALTH.name}` },
  { id: 'mock' as const, label: 'Demo data' },
];

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

  const setSource = (dataSource: 'health_connect' | 'mock') => db.update(settings).set({ dataSource }).where(eq(settings.id, 1)).run();

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
      `Asks ${PHONE_HEALTH.name} for the last ${Math.round(TUNABLES.sync.backfillDays / 30)} months instead of just the recent days, a month at a time. It only has what Garmin wrote into it, so this reaches back as far as that goes and no further. Nothing is duplicated.`,
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
        <Title subtitle={`Garmin Connect writes to ${PHONE_HEALTH.name}; this app reads from it. Nothing is written back.`}>Data source</Title>

        <Chips options={SOURCE_OPTIONS} selected={current ? [current.dataSource] : []} onToggle={setSource} />
        <View style={{ height: space.md }} />
        {current?.dataSource === 'mock' ? (
          <Body dim>Demo data is generated on the phone so every screen has something to show. Switch back to {PHONE_HEALTH.name} on your real phone.</Body>
        ) : null}

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

        <SectionLabel>Sync</SectionLabel>
        <Card>
          <Body dim>Last sync: {last ? last.toLocaleString() : 'never'}</Body>
          <Button variant="secondary" label={busy ? 'Working…' : 'Sync now'} onPress={sync} disabled={busy} />
          <Button variant="secondary" label={busy ? 'Working…' : 'Re-read everything'} onPress={backfill} disabled={busy} />
          <Body dim>Pulls back as far as Garmin wrote into {PHONE_HEALTH.name}. Run it once after connecting the watch, and after any update that adds a new metric.</Body>
          {status ? <Body dim>{status}</Body> : null}
        </Card>

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
      </Screen>
    </>
  );
}
