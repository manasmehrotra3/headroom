import { useMemo } from 'react';

/**
 * Caches the result of a synchronous repo read until one of `deps` changes.
 *
 * Repo functions talk to SQLite synchronously, on the JS thread. Calling one straight from a
 * component body runs it again on *every* render — and these screens re-render whenever any of
 * their live queries fires, or any local state changes — so a handful of reads turns into dozens
 * of SQLite round trips for data that did not change. A few of those reads also write (see
 * `plannedMealsOn`, which builds the week's meal plan if it is missing), which is worse: a write
 * during render can wake the live queries that caused the render.
 *
 * Pass the `updatedAt` stamps of the live queries covering every table the read touches. They
 * change whenever those tables change, so the value stays exactly as fresh as a direct call while
 * being computed once per real change. The rule when adding a call: if the read can see a table,
 * that table needs a live query on the screen and its stamp in `deps`.
 */
export function useDbValue<T>(read: () => T, deps: readonly unknown[]): T {
  return useMemo(read, deps);
}
