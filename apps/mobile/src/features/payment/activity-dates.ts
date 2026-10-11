/** Local-day keys and month grids for the Activity date filter. */

/** One key per local calendar day, such as "2026-9-11" (months from 0). */
export function dayKey(time: number | Date) {
  const date = new Date(time);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Midnight at the start of the local day holding `time`. */
export function startOfDay(time: number | Date) {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Days of the set of transactions, for marking the calendar. */
export function activeDayKeys(
  items: readonly { createdAt?: number | undefined }[],
) {
  const keys = new Set<string>();
  for (const item of items) {
    if (item.createdAt !== undefined) keys.add(dayKey(item.createdAt));
  }
  return keys;
}

/**
 * Weeks of a month, Sunday first. Each cell is the day's midnight, or null
 * for the blanks before the 1st and after the last day.
 */
export function monthGrid(year: number, month: number): (number | null)[][] {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array.from(
    { length: first.getDay() },
    () => null,
  );
  for (let day = 1; day <= days; day += 1) {
    cells.push(new Date(year, month, day).getTime());
  }
  while (cells.length % 7) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
}
