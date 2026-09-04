import { NextResponse } from "next/server";
import { getDischargeStats } from "@/lib/discharge-storage";
import {
  calculateOverallStat,
  NOTICE_RATE_TARGET_PERCENT,
  COMPLETION_RATE_TARGET_PERCENT,
} from "@/lib/discharge-targets";
import { getPeriodComparison } from "@/lib/discharge-comparison";

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/; // 예: 2026-07

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period");

  if (!period || !PERIOD_PATTERN.test(period)) {
    return NextResponse.json(
      { ok: false, message: "기준 연월을 'YYYY-MM' 형식으로 입력해 주세요. 예: 2026-07" },
      { status: 400 },
    );
  }

  let stored;
  try {
    stored = await getDischargeStats(period);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "데이터를 불러오지 못했습니다.",
      },
      { status: 500 },
    );
  }

  if (!stored) {
    return NextResponse.json(
      { ok: false, message: `${period}에 업로드된 데이터가 없습니다. 먼저 엑셀을 업로드해 주세요.` },
      { status: 404 },
    );
  }

  const overall = calculateOverallStat(stored.departmentStats);

  let comparison = null;
  let comparisonError: string | undefined;
  try {
    comparison = await getPeriodComparison(period, overall);
  } catch (error) {
    comparisonError =
      error instanceof Error ? error.message : "전월·전년 비교를 불러오지 못했습니다.";
  }

  return NextResponse.json({
    ok: true,
    period,
    overall,
    targets: {
      noticeRatePercent: NOTICE_RATE_TARGET_PERCENT,
      completionRatePercent: COMPLETION_RATE_TARGET_PERCENT,
    },
    comparison,
    comparisonError,
    departmentStats: stored.departmentStats,
    doctorStats: stored.doctorStats,
    hourlyStats: stored.hourlyStats,
    reasonStats: stored.reasonStats,
    departmentHourlyStats: stored.departmentHourlyStats,
    departmentReasonStats: stored.departmentReasonStats,
    departmentHourlyReasonStats: stored.departmentHourlyReasonStats,
  });
}
