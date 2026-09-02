import { shouldRunDailyPass } from "@/domain/marks-schedule";
import { prisma } from "../db";
import { marksTimeZone, runDailyCollectionMarks } from "../services/marks";

let started = false;
let timer: ReturnType<typeof setInterval> | null = null;

export function startDailyMarksScheduler() {
  if (started || process.env.MARKS_SCHEDULER === "false") return;
  started = true;
  const timeZone = marksTimeZone();
  timer = setInterval(() => {
    void tick(timeZone);
  }, 60_000);
  void tick(timeZone);
}

async function tick(timeZone: string) {
  const now = new Date();
  const last = await prisma.importJob.findFirst({
    where: { name: "daily-marks", status: "SUCCEEDED" },
    orderBy: { finishedAt: "desc" },
  });
  const lastRunDate = last?.payloadHash ?? null;
  if (
    !shouldRunDailyPass({
      lastRunDate,
      now,
      timeZone,
      requireMidnightWindow: true,
    })
  ) {
    return;
  }
  try {
    await runDailyCollectionMarks();
  } catch (error) {
    console.error("[daily-marks]", error);
  }
}

export function stopDailyMarksScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
  started = false;
}
