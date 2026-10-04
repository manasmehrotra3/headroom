import { useState } from 'react';
import { View } from 'react-native';

import { TUNABLES } from '@/config/tunables';
import { WEEKDAYS, WEEKDAY_LABELS, type Weekday } from '@/domain/dates';
import { EQUIPMENT, EQUIPMENT_GROUP_LABELS, type EquipmentGroup, type EquipmentId } from '@/domain/equipment';
import {
  SESSION_TYPE_IDS,
  SESSION_TYPES,
  scheduleWarnings,
  type SessionType,
  type WeekSchedule,
} from '@/domain/schedule';
import { Body, Button, Chips, RowLink, SectionLabel, WarningList } from '@/ui/components';
import { space } from '@/ui/theme';

export function EquipmentForm({ value, onChange }: { value: EquipmentId[]; onChange: (ids: EquipmentId[]) => void }) {
  const toggle = (id: EquipmentId) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  const groups = Object.keys(EQUIPMENT_GROUP_LABELS) as EquipmentGroup[];

  return (
    <View>
      <Body dim>Untick anything your YMCA doesn't have. Workouts only use what's ticked.</Body>
      <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
        <View style={{ flex: 1 }}>
          <Button variant="secondary" label="Tick all" onPress={() => onChange(EQUIPMENT.map((item) => item.id))} />
        </View>
        <View style={{ flex: 1 }}>
          <Button variant="secondary" label="Clear all" onPress={() => onChange([])} />
        </View>
      </View>
      {groups.map((group) => (
        <View key={group}>
          <SectionLabel>{EQUIPMENT_GROUP_LABELS[group]}</SectionLabel>
          <Chips<EquipmentId>
            options={EQUIPMENT.filter((item) => item.group === group)}
            selected={value}
            onToggle={toggle}
          />
        </View>
      ))}
    </View>
  );
}

const SESSION_OPTIONS = SESSION_TYPE_IDS.map((id) => ({ id, label: SESSION_TYPES[id].label }));

export function ScheduleForm({ value, onChange }: { value: WeekSchedule; onChange: (schedule: WeekSchedule) => void }) {
  const [openDay, setOpenDay] = useState<Weekday | null>(null);

  return (
    <View>
      <Body dim>
        Your default week; tap a day to change it. Every day stays under the {TUNABLES.schedule.dailyCapMin}-minute
        cap, and individual sessions can be moved or skipped week by week.
      </Body>
      <View style={{ height: space.md }} />
      <WarningList warnings={scheduleWarnings(value)} />
      {WEEKDAYS.map((day) => (
        <View key={day}>
          <RowLink
            label={WEEKDAY_LABELS[day]}
            value={SESSION_TYPES[value[day]].label}
            onPress={() => setOpenDay(openDay === day ? null : day)}
          />
          {openDay === day ? (
            <View style={{ paddingVertical: space.md }}>
              <Chips<SessionType>
                options={SESSION_OPTIONS}
                selected={[value[day]]}
                onToggle={(sessionType) => {
                  onChange({ ...value, [day]: sessionType });
                  setOpenDay(null);
                }}
              />
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}
