import { desc, eq, isNotNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import Constants from 'expo-constants';
import { router } from 'expo-router';

import { db } from '@/db/client';
import { dailyMetrics, equipment, settings } from '@/db/schema';
import { formatTimeOfDay12h, parseTimeOfDay } from '@/domain/dates';
import { TabHeader } from '@/features/navigation/TabHeader';
import { PHONE_HEALTH } from '@/sources/phoneHealth';
import { Body, Card, RowGroup, RowLink, Screen, SectionLabel } from '@/ui/components';
import { DISCLAIMER } from '@/ui/disclaimer';

export default function SettingsTab() {
  const { data: settingsRows } = useLiveQuery(db.select().from(settings));
  const { data: availableEquipment } = useLiveQuery(db.select().from(equipment).where(eq(equipment.available, true)));
  // The latest VO2 max, so the row shows whether anything has been entered.
  const { data: vo2Rows } = useLiveQuery(
    db.select({ vo2Max: dailyMetrics.vo2Max }).from(dailyMetrics).where(isNotNull(dailyMetrics.vo2Max)).orderBy(desc(dailyMetrics.date)).limit(1),
  );
  const latestVo2 = vo2Rows[0]?.vo2Max ?? null;
  const current = settingsRows[0];
  const notificationMinutes = parseTimeOfDay(current?.notificationTime ?? '');

  return (
    <Screen bottomInset>
      <TabHeader title="Settings" showSettings={false} />

      <SectionLabel>You</SectionLabel>
      <RowGroup>
        <RowLink label="Body & goals" onPress={() => router.push('/edit/body')} />
        <RowLink label="Running & watch" onPress={() => router.push('/edit/running')} />
        <RowLink label="Diet" onPress={() => router.push('/edit/diet')} />
        <RowLink label="Injuries & niggles" onPress={() => router.push('/edit/injuries')} />
      </RowGroup>

      <SectionLabel>Training</SectionLabel>
      <RowGroup>
        <RowLink label="YMCA equipment" value={`${availableEquipment.length} items`} onPress={() => router.push('/edit/equipment')} />
        <RowLink label="Weekly schedule" onPress={() => router.push('/edit/schedule')} />
        <RowLink label="Effort scale" value={current?.effortScale === 'rir' ? 'RIR' : 'RPE'} onPress={() => router.push('/edit/effort')} />
        <RowLink label="Running paces (VDOT)" onPress={() => router.push('/edit/paces')} />
        <RowLink label="VO2 max" value={latestVo2 ? latestVo2.toFixed(1) : 'none yet'} onPress={() => router.push('/edit/vo2')} />
        <RowLink label="Races & race plan" onPress={() => router.push('/edit/races')} />
        <RowLink label="Run history" onPress={() => router.push('/insights/runs')} />
        <RowLink label="Exercise library" onPress={() => router.push('/exercises')} />
      </RowGroup>

      <SectionLabel>Data</SectionLabel>
      <RowGroup>
        <RowLink
          label={`Garmin & ${PHONE_HEALTH.name}`}
          value={current?.dataSource === 'mock' ? 'demo data' : current?.dataSource === 'garmin_api' ? 'Garmin direct' : current?.healthConnectConnected ? 'connected' : 'not connected'}
          onPress={() => router.push('/edit/health')}
        />
        <RowLink label="Notifications" value={notificationMinutes === null ? undefined : formatTimeOfDay12h(notificationMinutes)} onPress={() => router.push('/edit/notifications')} />
        <RowLink label="Sleep & step goals" onPress={() => router.push('/edit/routine')} />
        <RowLink label="Progress photos" onPress={() => router.push('/edit/photos')} />
        <RowLink label="Backup & restore" onPress={() => router.push('/edit/backup')} />
      </RowGroup>

      <SectionLabel>About</SectionLabel>
      <Card>
        <Body dim>{DISCLAIMER}</Body>
        <Body dim>Version {Constants.expoConfig?.version}. All data is stored only on this phone. Exercise frames: free-exercise-db (public domain). Food values: IFCT 2017 where available; dishes are estimates.</Body>
      </Card>
    </Screen>
  );
}
