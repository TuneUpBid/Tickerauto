export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startDailyMarksScheduler } = await import("./server/jobs/daily-marks-scheduler");
  startDailyMarksScheduler();
}
