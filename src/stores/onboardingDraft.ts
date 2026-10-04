import { create } from 'zustand';

import { TUNABLES } from '@/config/tunables';
import { EQUIPMENT, type EquipmentId } from '@/domain/equipment';
import type { ProfileDraft } from '@/domain/profile';
import { DEFAULT_SCHEDULE, type WeekSchedule } from '@/domain/schedule';

/** Answers collected across the onboarding steps; saved to the database only on Finish. */
interface OnboardingDraft {
  profile: ProfileDraft;
  schedule: WeekSchedule;
  equipment: EquipmentId[];
  notificationTime: string;
  updateProfile: (changes: Partial<ProfileDraft>) => void;
  setSchedule: (schedule: WeekSchedule) => void;
  setEquipment: (ids: EquipmentId[]) => void;
  setNotificationTime: (time: string) => void;
}

const EMPTY_PROFILE: ProfileDraft = {
  name: '',
  sex: null,
  birthYear: null,
  heightCm: null,
  startWeightKg: null,
  goalWeightKg: null,
  dailyActivity: 'sedentary',
  fiveKTimeSec: null,
  easyPaceSecPerMile: null,
  maxHr: null,
  garminModel: '',
  eatsEggs: false,
  wheyOk: false,
  dislikedFoods: [],
  injuries: [],
  sleepTargetMin: TUNABLES.defaults.sleepTargetMin,
};

export const useOnboardingDraft = create<OnboardingDraft>((set) => ({
  profile: EMPTY_PROFILE,
  schedule: DEFAULT_SCHEDULE,
  equipment: EQUIPMENT.map((item) => item.id),
  notificationTime: TUNABLES.defaults.notificationTime,
  updateProfile: (changes) => set((state) => ({ profile: { ...state.profile, ...changes } })),
  setSchedule: (schedule) => set({ schedule }),
  setEquipment: (equipment) => set({ equipment }),
  setNotificationTime: (notificationTime) => set({ notificationTime }),
}));
