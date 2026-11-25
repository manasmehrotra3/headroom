/**
 * Every tunable number in the app lives here, so behaviour can be adjusted
 * without digging through logic. Units are part of each name (Min, Kg, Days...).
 */
export const TUNABLES = {
  schedule: {
    /** Hard cap for one day's training, strength + running + warmup combined. */
    dailyCapMin: 50,
    /** What the planner aims for, leaving slack under the cap. */
    targetSessionMin: 45,
    /** Weekends get their own allowance so endurance sessions (long ride / long run) fit. */
    weekendCapMin: 120,
    /** Hard ceiling for a weekend long session, however close the race is. */
    weekendLongMaxMin: 240,
    /** Extra minutes allowed on top of the long session for the brick run and faff. */
    weekendBufferMin: 30,
  },

  steps: {
    /** Daily step goal shown on Today and in the home/lock screen widget. */
    dailyGoal: 8000,
  },

  vo2: {
    /** How far back the VO2 max trend looks. The watch updates it every few runs, not daily. */
    trendWindowDays: 90,
    /** A change smaller than this is noise in the watch's estimate, not fitness. */
    meaningfulChange: 0.5,
  },

  weight: {
    /** Body weight trend is a trailing moving average over this many calendar days. */
    movingAverageDays: 7,
  },

  defaults: {
    /** Morning digest notification, "HH:MM" 24h. */
    notificationTime: '06:30',
    /** Evening preview of tomorrow's session and meals. */
    eveningPreviewTime: '20:00',
    sleepTargetMin: 8 * 60,
  },

  strength: {
    /** General warmup before the first exercise, counted against the daily cap. */
    warmupMin: 5,
    /** Seconds one rep takes, for time estimates. */
    secPerRep: 3,
    /** Walking between machines, adjusting seats, entering the set. */
    transitionSec: 60,
    /** Weight goes up when every set reaches the top of the rep range at or below this RPE. */
    progressMaxRpe: 8,
    /** Missing the bottom of the rep range this many sessions in a row triggers a drop. */
    missedSessionsBeforeDrop: 2,
    /** How much to drop after repeated misses (fraction of the working weight). */
    dropFraction: 0.075,
    /** Smallest weight step, by exercise "family". Both lb because that's how gym plates come. */
    incrementLb: { upper: 5, lower: 10, small: 2.5 },
    /** Default rest by tier when an exercise doesn't say otherwise. */
    restSec: { primary: 120, secondary: 90, accessory: 60 },
    /** Warn when the projected finish is this far past the cap. */
    overCapWarnMin: 0,
    /** Easy variant: sets removed from each primary exercise, and the RPE ceiling. */
    easyVariant: { setsRemovedFromPrimaries: 1, rpeCap: 7 },
    /** Deload: fraction of sets kept (spec: about 40% less volume). */
    deloadVolumeFraction: 0.6,
    /** Default starting weights (lb) when there's no history, by load type. */
    startingWeightLb: { machine: 40, dumbbell: 15, barbell: 45, cable: 30, kettlebell: 25 },
    /** How long a set-logging session can idle before it's treated as abandoned. */
    abandonAfterHours: 6,
  },

  load: {
    /** Acute (7-day) and chronic (28-day) windows for the ACWR. */
    acuteDays: 7,
    chronicDays: 28,
    /** Below this many days of history the ratio isn't shown. */
    minHistoryDays: 21,
    /** ACWR labels. */
    acwrLow: 0.8,
    acwrHigh: 1.3,
    acwrDanger: 1.5,
    /** Estimated RPE from average heart rate as a fraction of heart-rate reserve. */
    rpeFromHrr: [
      { maxHrr: 0.5, rpe: 3 },
      { maxHrr: 0.6, rpe: 4 },
      { maxHrr: 0.7, rpe: 5 },
      { maxHrr: 0.8, rpe: 6 },
      { maxHrr: 0.87, rpe: 7 },
      { maxHrr: 0.93, rpe: 8 },
      { maxHrr: 1.0, rpe: 9 },
    ],
    /**
     * How far back the "rate recent sessions" prompt asks. Older sessions keep the RPE estimated
     * from heart rate: by then you can't remember how hard it felt, so a guess is worth more than
     * a prompt that never clears.
     */
    rpePromptDays: 7,
    /** RPE assumed for activities with neither a rating nor heart rate. */
    defaultRpe: { run: 5, tennis: 6, strength: 7, walk: 2, yoga: 3, cycling: 5, swim: 5, other: 4 },
  },

  sleep: {
    weights: { duration: 40, efficiency: 20, stages: 20, consistency: 20 },
    /** Efficiency at or above this scores full marks. */
    fullEfficiency: 0.9,
    zeroEfficiency: 0.6,
    /** Deep + REM share of sleep for full marks. */
    fullDeepRemShare: 0.4,
    /** Bed/wake time drift vs the 7-day average: full marks up to this, zero from this. */
    consistencyFullMin: 30,
    consistencyZeroMin: 120,
    consistencyBaselineDays: 7,
    /** A nap shorter than this doesn't count as the night's main sleep. */
    minMainSleepMin: 3 * 60,
  },

  readiness: {
    weights: { sleep: 35, restingHr: 25, hrv: 20, checkin: 20 },
    restingHrBaselineDays: 28,
    hrvBaselineDays: 7,
    /** Resting HR above baseline by this many bpm scores zero on that component. */
    restingHrZeroAboveBpm: 8,
    /** HRV at this fraction of baseline scores zero. */
    hrvZeroFraction: 0.7,
    good: 75,
    moderate: 50,
    /** Readiness is "low" on this many of the last N days triggers an early deload. */
    lowDaysForDeload: 3,
    lowDaysWindow: 5,
  },

  plan: {
    /** Weekly running volume may grow at most this fraction week over week. */
    maxWeeklyRunGrowth: 0.1,
    /** How much to trim sessions after the ACWR goes above acwrHigh. */
    acwrTrimFraction: 0.25,
    acwrTrimSessions: 3,
    /** Every Nth week is a deload. */
    deloadEveryWeeks: 4,
    /** Sunday tennis longer than this, or harder than this RPE, makes Monday lighter. */
    tennisLongMin: 90,
    tennisHardRpe: 7,
    tennisMondayTrim: 0.25,
    /** Pain lasting this many days prompts a physio suggestion. */
    painPhysioDays: 3,
    /** Wednesday add-on only fits if the run leaves this many minutes under the cap. */
    addOnMin: 10,
    /** Re-estimate running paces from recent runs every N weeks, capped at ±1 VDOT per update. */
    vdotReestimateWeeks: 3,
    vdotMaxStepPerUpdate: 1,
    vdotLookbackDays: 28,
    /** Starting weekly run volume (minutes) when there's no history. */
    startingRunMin: { quality: 30, easy: 30 },
    /** Session durations grow toward these caps. */
    maxRunMin: { quality: 45, easy: 45 },
  },

  running: {
    /** Daniels-style intensity bands as fractions of VO2max. */
    intensity: { easy: 0.68, marathon: 0.79, tempo: 0.86, interval: 0.98, repetition: 1.05 },
    /** Riegel exponent for converting a race time to another distance. */
    riegelExponent: 1.06,
    /** Minutes of warmup and cooldown in a quality run. */
    warmupMin: 10,
    cooldownMin: 5,
    /** Easy run: fraction of the run at easy pace with strides at the end. */
    stridesCount: 4,
    strideSec: 20,
  },

  nutrition: {
    /** Mifflin-St Jeor activity multipliers by how active the day job is. */
    activityFactor: { sedentary: 1.35, light: 1.5, active: 1.65 },
    /** Target fat loss as a fraction of body weight per week. */
    weeklyLossFraction: 0.006,
    minWeeklyLossFraction: 0.005,
    maxWeeklyLossFraction: 0.0075,
    /** Energy in a kilogram of body fat, for the deficit maths. */
    kcalPerKgFat: 7700,
    maxDeficitKcal: 500,
    proteinGPerKg: 1.8,
    proteinMinGPerKg: 1.6,
    proteinMaxGPerKg: 2.0,
    fatMinGPerKg: 0.8,
    /** Carb shift on run / tennis days and rest days (fraction of the carb target). */
    carbShiftTraining: 0.15,
    carbShiftRest: -0.15,
    /** Targets are reviewed every N days against the weight trend and moved by this step. */
    recalcEveryDays: 14,
    recalcStepKcal: 100,
    /** Meal plan: a dish can't repeat within this many days. */
    noRepeatDays: 7,
    /** Fraction of daily calories per slot. */
    slotShare: { breakfast: 0.25, lunch: 0.35, snack: 0.1, dinner: 0.3 },
    /** How close (fraction) a swap must be in calories and protein. */
    swapTolerance: 0.2,
    /** "Cook once, eat twice": repeat these slots the next day as leftovers. */
    cookOnceSlots: ['dinner'] as const,
  },

  cycling: {
    /** Cycling max heart rate is typically a bit lower than running. */
    maxHrOffsetFromRun: 10,
    /** Zone ceilings as a fraction of cycling max HR (Z1 easy ... Z5 VO2). */
    zoneCeilings: { z1: 0.68, z2: 0.75, z3: 0.83, z4: 0.92, z5: 1.0 },
    /** Warmup and cooldown inside a structured bike session. */
    warmupMin: 10,
    cooldownMin: 5,
    /** Default durations when there is no race to build toward. */
    defaultQualityMin: 45,
    defaultEasyMin: 40,
    defaultLongMin: 75,
    /** Cadence cues shown with each zone. */
    cadence: { endurance: '85-95 rpm', tempo: '85-90 rpm', threshold: '90-95 rpm', vo2: '95-105 rpm' },
  },

  swim: {
    /** The Monday the triathlon week first includes swims. Weeks before it have none. */
    startDate: '2026-12-07',
    /** Pool length in metres, used to say how many lengths each repeat is. Sets are written in 50s and 100s, which suit a 25 m or 50 m pool. */
    poolLengthM: 50,
    /** Metres in each session of the first week. 800 suits someone who cannot yet swim 200 m without stopping. */
    startDistanceM: 800,
    /** What the sessions build to. The endurance swim ends past the 70.3's 1,900 m. */
    maxDistanceM: { technique: 1200, endurance: 2200 },
    /** Session distance grows by this much a week until it reaches the maximum. */
    weeklyGrowth: 0.1,
    /**
     * Minutes per 100 m including the rests at the wall, used to turn metres into planned time.
     * 3 is a beginner. The daily time cap limits a session to about 1,700 m at this pace, so
     * lower it as you get faster and the sessions will grow past that.
     */
    minPer100m: 3,
    /** Shortest session worth getting in the water for, in metres. */
    minDistanceM: 400,
  },

  race: {
    /** Long-session progression: where the ramp starts, in minutes. */
    startLongRideMin: 60,
    startLongRunMin: 40,
    /** The ramp toward peak runs over build + peak weeks. */
    rampWeeks: 10,
    /** Taper: fraction of the peak long session during taper and race week. */
    taperFraction: 0.6,
    raceWeekFraction: 0.4,
    /** Brick run off the long ride, by phase. */
    brickRunMin: { base: 10, build: 20, peak: 30, taper: 15, race_week: 10, off_season: 0 },
    /** Warn when the longest session done so far is this fraction short of what the race needs. */
    readinessShortfall: 0.75,
  },

  sync: {
    /** How far back the very first Health Connect sync reads. */
    initialDays: 60,
    /**
     * How far back "Re-read everything" in Settings goes. Garmin decides how much history it
     * actually wrote into Health Connect when you connected, so this is an upper bound, not a
     * promise: reading past the oldest record simply returns nothing.
     */
    backfillDays: 365,
    /**
     * Health Connect is read a month at a time. Garmin writes near-continuous heart rate, so a
     * year read in one go would hold millions of samples in memory at once. Chunking keeps peak
     * memory flat however long the window is.
     */
    chunkDays: 30,
    /** Later syncs re-read this many days so late-arriving Garmin data is picked up. */
    overlapDays: 3,
    /**
     * The only app whose steps, active calories, distance and workouts are read from Health
     * Connect. Other apps (Samsung Health counting with the phone, say) also write steps, and
     * Health Connect's own total fills gaps in the watch's record with them, so it reads higher
     * than Garmin Connect. Theirs are never used, even on a day the watch wrote nothing.
     */
    watchApp: 'com.garmin.android.apps.connectmobile',
    /**
     * Background task interval (minutes); the phone runs it roughly this often, no more.
     * This also sets how fresh the lock screen widget can be, since nothing else refreshes the
     * numbers while the app is closed. Android will not run it more often than every 15 minutes.
     */
    backgroundIntervalMin: 30,
    /** Earliest hour the background task will sync for today's digest. */
    earliestSyncHour: 3,
  },

  garmin: {
    /** Days per request. Garmin's sleep endpoint refuses more than 31; 28 leaves room. */
    windowDays: 28,
    /** Activities per page. Garmin's own client asks for 20. */
    pageSize: 20,
    /** Ask for a new bearer token when the saved one has less than this left. Tokens last a day. */
    tokenRefreshMarginMin: 60,
    /** Garmin publishes no rate limits, so on "too many requests" wait and retry this many times. */
    retries: 3,
    /** Wait before the first retry, doubled each time, unless Garmin says how long to wait. */
    retryWaitSec: 5,
    /** Never wait longer than this for one retry, whatever Garmin asks for. */
    maxRetryWaitSec: 60,
    /** Give up on a request that has not answered in this long. */
    timeoutSec: 30,
    /** Start warning this many days before the key's expiry date. */
    keyWarningDays: 14,
    /** Keys are created for a year unless you pick something else in Garmin Connect. */
    keyLifetimeDays: 365,
  },

  dedupe: {
    /** Two activities are the same if starts are within this and durations within this fraction. */
    startWithinMin: 5,
    durationWithinFraction: 0.15,
  },
} as const;
