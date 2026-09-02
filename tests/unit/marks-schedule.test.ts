import { describe, expect, it } from "vitest";
import {
  calendarDateInTimeZone,
  isMidnightWindow,
  shouldRefreshVehicleMark,
  shouldRunDailyPass,
} from "@/domain/marks-schedule";

describe("daily marks schedule", () => {
  it("runs once per Pacific calendar day after midnight", () => {
    const midnightPt = new Date("2026-09-02T07:10:00.000Z");
    expect(calendarDateInTimeZone(midnightPt, "America/Los_Angeles")).toBe("2026-09-02");
    expect(isMidnightWindow(midnightPt, "America/Los_Angeles")).toBe(true);
    expect(
      shouldRunDailyPass({
        lastRunDate: null,
        now: midnightPt,
        timeZone: "America/Los_Angeles",
        requireMidnightWindow: true,
      }),
    ).toBe(true);
    expect(
      shouldRunDailyPass({
        lastRunDate: "2026-09-02",
        now: midnightPt,
        timeZone: "America/Los_Angeles",
        requireMidnightWindow: true,
      }),
    ).toBe(false);
  });

  it("does not rebuild a certified appraisal and skips a same-day draft", () => {
    const certified = shouldRefreshVehicleMark({
      latestStatus: "CERTIFIED",
      latestEffectiveOn: "2026-08-01T00:00:00.000Z",
      today: "2026-09-02",
    });
    expect(certified.refresh).toBe(false);
    expect(certified.snapshotOnly).toBe(true);
    const sameDay = shouldRefreshVehicleMark({
      latestStatus: "DRAFT",
      latestEffectiveOn: "2026-09-02T08:00:00.000Z",
      today: "2026-09-02",
      timeZone: "UTC",
    });
    expect(sameDay.refresh).toBe(false);
    const stale = shouldRefreshVehicleMark({
      latestStatus: "INSUFFICIENT_DATA",
      latestEffectiveOn: "2026-09-01T08:00:00.000Z",
      today: "2026-09-02",
      timeZone: "UTC",
    });
    expect(stale.refresh).toBe(true);
  });
});
