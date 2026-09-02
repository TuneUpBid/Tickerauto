import { NextResponse } from "next/server";
import { runDailyCollectionMarks } from "@/server/services/marks";

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return process.env.APP_ENV !== "production";
  const header = request.headers.get("authorization");
  const query = new URL(request.url).searchParams.get("secret");
  return header === `Bearer ${expected}` || query === expected;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const force = new URL(request.url).searchParams.get("force") === "1";
  const result = await runDailyCollectionMarks({ force });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  return GET(request);
}
