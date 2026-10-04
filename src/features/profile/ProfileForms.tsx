/**
 * Profile forms shared by onboarding and Settings. Each takes the current draft and
 * reports changes; the caller decides when to validate and save.
 */
import { useState } from 'react';
import { View } from 'react-native';

import { BODY_AREAS, type BodyArea } from '@/domain/bodyAreas';
import { ageInYear, formatTimeOfDay, formatTimeOfDay12h, parseTimeOfDay } from '@/domain/dates';
import { DAILY_ACTIVITY_LABELS, type DailyActivity, type ProfileDraft } from '@/domain/profile';
import { cmToFeetInches, feetInchesToCm, kgToLb, lbToKg, roundTo } from '@/domain/units';
import { Body, Chips, Field, SectionLabel, Stepper } from '@/ui/components';
import { DurationField, NumberField } from '@/ui/fields';
import { formatHoursMinutes } from '@/ui/format';
import { space } from '@/ui/theme';

interface FormProps {
  value: ProfileDraft;
  onChange: (changes: Partial<ProfileDraft>) => void;
}

const SEX_OPTIONS = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
] as const;

const ACTIVITY_OPTIONS = (Object.keys(DAILY_ACTIVITY_LABELS) as DailyActivity[]).map((id) => ({
  id,
  label: DAILY_ACTIVITY_LABELS[id],
}));

const YES_NO = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
] as const;

const kgToLbOrNull = (kg: number | null) => (kg === null ? null : roundTo(kgToLb(kg), 0.1));

export function BodyForm({ value, onChange, weightLabel = 'Current weight (lb)' }: FormProps & { weightLabel?: string }) {
  const initialHeight = value.heightCm === null ? null : cmToFeetInches(value.heightCm);
  const [feet, setFeet] = useState<number | null>(initialHeight?.feet ?? null);
  const [inches, setInches] = useState<number | null>(initialHeight?.inches ?? null);

  const setHeight = (nextFeet: number | null, nextInches: number | null) => {
    setFeet(nextFeet);
    setInches(nextInches);
    onChange({ heightCm: nextFeet === null ? null : feetInchesToCm(nextFeet, nextInches ?? 0) });
  };

  return (
    <View>
      <Field
        label="First name (optional)"
        hint="Only used to greet you on the Today screen."
        value={value.name}
        onChangeText={(name) => onChange({ name })}
        placeholder="e.g. Alex"
      />

      <SectionLabel>Sex</SectionLabel>
      <Body dim>Used by the calorie (BMR) and heart-rate formulas.</Body>
      <View style={{ height: space.sm }} />
      <Chips options={SEX_OPTIONS} selected={value.sex ? [value.sex] : []} onToggle={(sex) => onChange({ sex })} />

      <SectionLabel>Basics</SectionLabel>
      <NumberField
        label="Age"
        value={value.birthYear === null ? null : ageInYear(value.birthYear)}
        onChange={(age) => onChange({ birthYear: age === null ? null : new Date().getFullYear() - age })}
      />
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <View style={{ flex: 1 }}>
          <NumberField label="Height (ft)" value={feet} onChange={(next) => setHeight(next, inches)} />
        </View>
        <View style={{ flex: 1 }}>
          <NumberField label="(in)" value={inches} onChange={(next) => setHeight(feet, next)} />
        </View>
      </View>
      <NumberField
        decimal
        label={weightLabel}
        value={kgToLbOrNull(value.startWeightKg)}
        onChange={(lb) => onChange({ startWeightKg: lb === null ? null : lbToKg(lb) })}
      />
      <NumberField
        decimal
        label="Goal weight (lb)"
        value={kgToLbOrNull(value.goalWeightKg)}
        onChange={(lb) => onChange({ goalWeightKg: lb === null ? null : lbToKg(lb) })}
      />

      <SectionLabel>Activity outside training</SectionLabel>
      <Chips
        options={ACTIVITY_OPTIONS}
        selected={[value.dailyActivity]}
        onToggle={(dailyActivity) => onChange({ dailyActivity })}
      />
    </View>
  );
}

export function RunningForm({ value, onChange }: FormProps) {
  return (
    <View>
      <Body dim>
        Either one is enough to set starting run paces. Paces are re-estimated from your actual runs later.
      </Body>
      <SectionLabel>Current fitness</SectionLabel>
      <DurationField
        label="Recent 5K time"
        value={value.fiveKTimeSec}
        onChange={(fiveKTimeSec) => onChange({ fiveKTimeSec })}
      />
      <DurationField
        label="Or: easy pace per mile"
        value={value.easyPaceSecPerMile}
        onChange={(easyPaceSecPerMile) => onChange({ easyPaceSecPerMile })}
      />

      <SectionLabel>Heart rate & watch</SectionLabel>
      <NumberField
        label="Max heart rate (optional)"
        hint="Leave blank to estimate it from your age."
        value={value.maxHr}
        onChange={(maxHr) => onChange({ maxHr: maxHr === null ? null : Math.round(maxHr) })}
      />
      <Field
        label="Garmin watch model"
        placeholder="e.g. Forerunner 265"
        value={value.garminModel}
        onChangeText={(garminModel) => onChange({ garminModel })}
      />
    </View>
  );
}

export function DietForm({ value, onChange }: FormProps) {
  const [dislikes, setDislikes] = useState(value.dislikedFoods.join(', '));
  return (
    <View>
      <Body dim>Meal plans are Indian vegetarian with dairy.</Body>

      <SectionLabel>Eggs</SectionLabel>
      <Chips
        options={YES_NO}
        selected={[value.eatsEggs ? 'yes' : 'no']}
        onToggle={(id) => onChange({ eatsEggs: id === 'yes' })}
      />

      <SectionLabel>Whey protein</SectionLabel>
      <Chips
        options={YES_NO}
        selected={[value.wheyOk ? 'yes' : 'no']}
        onToggle={(id) => onChange({ wheyOk: id === 'yes' })}
      />

      <SectionLabel>Foods you dislike or avoid</SectionLabel>
      <Field
        label="Separate with commas"
        placeholder="e.g. karela, mushrooms"
        multiline
        value={dislikes}
        onChangeText={(text) => {
          setDislikes(text);
          onChange({
            dislikedFoods: text
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean),
          });
        }}
      />
    </View>
  );
}

export function InjuriesForm({ value, onChange }: FormProps) {
  const selected = value.injuries.map((injury) => injury.area);

  const toggle = (area: BodyArea) =>
    onChange({
      injuries: selected.includes(area)
        ? value.injuries.filter((injury) => injury.area !== area)
        : [...value.injuries, { area, note: '' }],
    });

  const setNote = (area: BodyArea, note: string) =>
    onChange({ injuries: value.injuries.map((injury) => (injury.area === area ? { ...injury, note } : injury)) });

  return (
    <View>
      <Body dim>
        Tap any area to be careful with, and workouts will go easy on it. Leave everything unselected if nothing
        bothers you.
      </Body>
      <SectionLabel>Areas</SectionLabel>
      <Chips options={BODY_AREAS} selected={selected} onToggle={toggle} />
      {value.injuries.length > 0 ? <SectionLabel>Notes</SectionLabel> : null}
      {value.injuries.map((injury) => (
        <Field
          key={injury.area}
          label={BODY_AREAS.find((area) => area.id === injury.area)!.label}
          placeholder="e.g. sore after long runs"
          value={injury.note}
          onChangeText={(note) => setNote(injury.area, note)}
        />
      ))}
    </View>
  );
}

export function RoutineForm({
  notificationTime,
  onNotificationTime,
  sleepTargetMin,
  onSleepTarget,
}: {
  notificationTime: string;
  onNotificationTime: (time: string) => void;
  sleepTargetMin: number;
  onSleepTarget: (minutes: number) => void;
}) {
  return (
    <View>
      <Stepper
        label="Morning digest notification"
        value={parseTimeOfDay(notificationTime) ?? 6 * 60 + 30}
        step={15}
        min={4 * 60}
        max={11 * 60}
        format={formatTimeOfDay12h}
        onChange={(minutes) => onNotificationTime(formatTimeOfDay(minutes))}
      />
      <Body dim>A one-line summary of sleep, readiness and today's plan. Notifications switch on in a later phase.</Body>
      <View style={{ height: space.lg }} />
      <Stepper
        label="Sleep target"
        value={sleepTargetMin}
        step={15}
        min={5 * 60}
        max={11 * 60}
        format={formatHoursMinutes}
        onChange={onSleepTarget}
      />
      <Body dim>Used by the sleep score.</Body>
    </View>
  );
}
