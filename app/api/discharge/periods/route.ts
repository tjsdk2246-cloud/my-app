import { NextResponse } from "next/server";
import { listAvailablePeriods } from "@/lib/discharge-storage";

export async function GET() {
  try {
    const periods = await listAvailablePeriods();
    return NextResponse.json({ ok: true, periods });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "연월 목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
