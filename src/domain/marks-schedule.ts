export const DEFAULT_MARKS_TIMEZONE = "America/Los_Angeles";

export function calendarDateInTimeZone(
  date: Date,
  timeZone: string = DEFAULT_MARKS_TIMEZONE,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function hourInTimeZone(date: Date, timeZone: string = DEFAULT_MARKS_TIMEZONE): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hourCycle: "h23",
    }).format(date),
  );
}

export function isMidnightWindow(date: Date, timeZone: string = DEFAULT_MARKS_TIMEZONE): boolean {
  return hourInTimeZone(date, timeZone) === 0;
}

export function shouldRunDailyPass(input: {
  lastRunDate: string | null;
  now: Date;
  timeZone?: string;
  requireMidnightWindow?: boolean;
}): boolean {
  const timeZone = input.timeZone ?? DEFAULT_MARKS_TIMEZONE;
  const today = calendarDateInTimeZone(input.now, timeZone);
  if (input.lastRunDate === today) return false;
  if (input.requireMidnightWindow && !isMidnightWindow(input.now, timeZone)) return false;
  return true;
}

export function shouldRefreshVehicleMark(input: {
  latestStatus: string | null;
  latestEffectiveOn: Date | string | null;
  today: string;
  timeZone?: string;
}): { refresh: boolean; snapshotOnly: boolean; reason: string } {
  if (input.latestStatus === "CERTIFIED") {
    return {
      refresh: false,
      snapshotOnly: true,
      reason: "Independently appraised value is left in place. The nightly pass only snapshots it.",
    };
  }
  if (input.latestEffectiveOn) {
    const markedOn = calendarDateInTimeZone(new Date(input.latestEffectiveOn), input.timeZone);
    if (markedOn === input.today) {
      return {
        refresh: false,
        snapshotOnly: true,
        reason: "A draft mark already exists for this calendar day.",
      };
    }
  }
  return {
    refresh: true,
    snapshotOnly: false,
    reason: "Pull completed sales and rebuild the source-backed draft.",
  };
}
