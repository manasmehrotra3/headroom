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
import {
  CalendarIcon,
  FoodIcon,
  GearIcon,
  HeartIcon,
  ProgressIcon,
  RunIcon,
  ScaleIcon,
  SettingsIcon,
  TodayIcon,
  TrainIcon,
} from '@/ui/icons';
import { M3Enter } from '@/ui/motion';
import { colors } from '@/ui/theme';

export default function SettingsTab() {
  const { data: settingsRows } = useLiveQuery(db.select().from(settings));
  const { data: availableEquipment } = useLiveQuery(db.select().from(equipment).where(eq(equipment.available, true)));
  const { data: vo2Rows } = useLiveQuery(
    db.select({ vo2Max: dailyMetrics.vo2Max }).from(dailyMetrics).where(isNotNull(dailyMetrics.vo2Max)).orderBy(desc(dailyMetrics.date)).limit(1),
  );
  const latestVo2 = vo2Rows[0]?.vo2Max ?? null;
  const current = settingsRows[0];
  const notificationMinutes = parseTimeOfDay(current?.notificationTime ?? '');

  return (
    <Screen bottomInset>
      <TabHeader title="Settings" subtitle="Material You Ocean · All data stays on this phone." showSettings={false} />

      <M3Enter index={0}>
        <SectionLabel>You</SectionLabel>
        <RowGroup>
          <RowLink icon={<ScaleIcon color={colors.primary} size={18} />} label="Body & goals" onPress={() => router.push('/edit/body')} />
          <RowLink icon={<RunIcon color={colors.primary} size={18} />} label="Running & watch" onPress={() => router.push('/edit/running')} />
          <RowLink icon={<FoodIcon color={colors.primary} size={18} />} label="Diet" onPress={() => router.push('/edit/diet')} />
          <RowLink icon={<HeartIcon color={colors.primary} size={18} />} label="Injuries & niggles" onPress={() => router.push('/edit/injuries')} />
        </RowGroup>
      </M3Enter>

      <M3Enter index={1}>
        <SectionLabel>Training</SectionLabel>
        <RowGroup>
          <RowLink icon={<TrainIcon color={colors.primary} size={18} />} label="YMCA equipment" value={`${availableEquipment.length} items`} onPress={() => router.push('/edit/equipment')} />
          <RowLink icon={<CalendarIcon color={colors.primary} size={18} />} label="Weekly schedule" onPress={() => router.push('/edit/schedule')} />
          <RowLink icon={<SettingsIcon color={colors.primary} size={18} />} label="Effort scale" value={current?.effortScale === 'rir' ? 'RIR' : 'RPE'} onPress={() => router.push('/edit/effort')} />
          <RowLink icon={<RunIcon color={colors.primary} size={18} />} label="Running paces (VDOT)" onPress={() => router.push('/edit/paces')} />
          <RowLink icon={<ProgressIcon color={colors.primary} size={18} />} label="VO2 max" value={latestVo2 ? latestVo2.toFixed(1) : 'none yet'} onPress={() => router.push('/edit/vo2')} />
          <RowLink icon={<TodayIcon color={colors.primary} size={18} />} label="Races & race plan" onPress={() => router.push('/edit/races')} />
          <RowLink icon={<RunIcon color={colors.primary} size={18} />} label="Run history" onPress={() => router.push('/insights/runs')} />
          <RowLink icon={<TrainIcon color={colors.primary} size={18} />} label="Exercise library" onPress={() => router.push('/exercises')} />
        </RowGroup>
      </M3Enter>

      <M3Enter index={2}>
        <SectionLabel>Data</SectionLabel>
        <RowGroup>
          <RowLink
            icon={<HeartIcon color={colors.tertiary} size={18} />}
            label={`Garmin & ${PHONE_HEALTH.name}`}
            value={current?.dataSource === 'mock' ? 'demo data' : current?.dataSource === 'garmin_api' ? 'Garmin direct' : current?.healthConnectConnected ? 'connected' : 'not connected'}
            onPress={() => router.push('/edit/health')}
          />
          <RowLink icon={<TodayIcon color={colors.tertiary} size={18} />} label="Notifications" value={notificationMinutes === null ? undefined : formatTimeOfDay12h(notificationMinutes)} onPress={() => router.push('/edit/notifications')} />
          <RowLink icon={<CalendarIcon color={colors.tertiary} size={18} />} label="Sleep & step goals" onPress={() => router.push('/edit/routine')} />
          <RowLink icon={<ProgressIcon color={colors.tertiary} size={18} />} label="Progress photos" onPress={() => router.push('/edit/photos')} />
          <RowLink icon={<GearIcon color={colors.tertiary} size={18} />} label="Backup & restore" onPress={() => router.push('/edit/backup')} />
        </RowGroup>
      </M3Enter>

      <M3Enter index={3}>
        <SectionLabel>About</SectionLabel>
        <Card tone="low">
          <Body dim>{DISCLAIMER}</Body>
          <Body dim>Version {Constants.expoConfig?.version}. All data is stored only on this phone. Exercise frames: free-exercise-db (public domain). Food values: IFCT 2017 where available; dishes are estimates.</Body>
        </Card>
      </M3Enter>
    </Screen>
  );
}
