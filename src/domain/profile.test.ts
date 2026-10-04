import { draftToProfile, validateBody, validateRoutine, validateRunning, type ProfileDraft } from './profile';

const today = new Date(2026, 8, 10);

const complete: ProfileDraft = {
  name: 'Alex',
  sex: 'male',
  birthYear: 1990,
  heightCm: 175,
  startWeightKg: 80,
  goalWeightKg: 72,
  dailyActivity: 'sedentary',
  fiveKTimeSec: 26 * 60,
  easyPaceSecPerMile: null,
  maxHr: null,
  garminModel: 'Forerunner 265',
  eatsEggs: false,
  wheyOk: true,
  dislikedFoods: [],
  injuries: [],
  sleepTargetMin: 480,
};

describe('profile validation', () => {
  it('accepts a complete profile', () => {
    expect(validateBody(complete, today)).toEqual([]);
    expect(validateRunning(complete)).toEqual([]);
    expect(validateRoutine(complete)).toEqual([]);
    expect(draftToProfile(complete, today)).toMatchObject({ sex: 'male', heightCm: 175 });
  });

  it('asks for missing body basics', () => {
    const blank: ProfileDraft = { ...complete, sex: null, birthYear: null, heightCm: null };
    expect(validateBody(blank, today)).toHaveLength(3);
    expect(draftToProfile(blank, today)).toBeNull();
  });

  it('rejects implausible values', () => {
    expect(validateBody({ ...complete, birthYear: 2020 }, today)).toEqual(['Age should be between 14 and 90.']);
    expect(validateRunning({ ...complete, fiveKTimeSec: 5 * 60 })).toHaveLength(1);
    expect(validateRunning({ ...complete, maxHr: 300 })).toHaveLength(1);
    expect(validateRoutine({ ...complete, sleepTargetMin: 13 * 60 })).toHaveLength(1);
  });

  it('treats running fitness as optional', () => {
    expect(validateRunning({ ...complete, fiveKTimeSec: null, easyPaceSecPerMile: null })).toEqual([]);
  });
});
