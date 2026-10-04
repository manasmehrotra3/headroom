import { create } from 'zustand';

/**
 * Ephemeral state for the workout player. Everything durable (the plan, every logged set)
 * lives in the database, so killing the app mid-session loses nothing.
 */
interface ActiveWorkoutState {
  /** Which exercise is on screen. null = follow the first unfinished one. */
  index: number | null;
  /** Rest timer end, epoch ms; null when not resting. */
  restEndsAt: number | null;
  restTotalSec: number;
  /** What comes after the rest, captured when the rest started. */
  restNextUp: string;
  setIndex: (index: number | null) => void;
  startRest: (seconds: number, nextUp: string) => void;
  extendRest: (seconds: number) => void;
  stopRest: () => void;
  reset: () => void;
}

export const useActiveWorkout = create<ActiveWorkoutState>((set) => ({
  index: null,
  restEndsAt: null,
  restTotalSec: 0,
  restNextUp: '',
  setIndex: (index) => set({ index }),
  startRest: (seconds, nextUp) => set({ restEndsAt: Date.now() + seconds * 1000, restTotalSec: seconds, restNextUp: nextUp }),
  extendRest: (seconds) =>
    set((state) => ({
      restEndsAt: (state.restEndsAt ?? Date.now()) + seconds * 1000,
      restTotalSec: state.restTotalSec + seconds,
    })),
  stopRest: () => set({ restEndsAt: null }),
  reset: () => set({ index: null, restEndsAt: null, restTotalSec: 0, restNextUp: '' }),
}));
