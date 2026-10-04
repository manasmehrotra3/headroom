import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { exportBackup, importBackup } from '@/sync/backup';
import { Body, Button, Card, Screen, SectionLabel, Title } from '@/ui/components';

export default function BackupScreen() {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const doExport = async () => {
    setBusy(true);
    try {
      await exportBackup();
      setStatus('Backup created. Save it somewhere safe (Drive, email to yourself…).');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const doImport = () =>
    Alert.alert('Replace all data?', 'Everything currently in the app is replaced by the backup. Export first if unsure.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Import',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          const result = await importBackup();
          setStatus(result.message);
          setBusy(false);
        },
      },
    ]);

  return (
    <>
      <Stack.Screen options={{ title: 'Backup & restore' }} />
      <Screen edges={['bottom']}>
        <Title subtitle="All your data lives only on this phone. Keep a backup before big updates or a new phone.">Backup</Title>
        <SectionLabel>Export</SectionLabel>
        <Card>
          <Body dim>Creates one JSON file with every table: profile, workouts, activities, sleep, food logs, plans. Progress photos are not included; they stay in the phone's app folder.</Body>
          <Button label={busy ? 'Working…' : 'Export backup'} onPress={() => void doExport()} disabled={busy} />
        </Card>
        <SectionLabel>Restore</SectionLabel>
        <Card>
          <Body dim>Pick a backup file. The app's current data is replaced.</Body>
          <Button variant="danger" label="Import backup…" onPress={doImport} disabled={busy} />
        </Card>
        {status ? <Body>{status}</Body> : null}
      </Screen>
    </>
  );
}
