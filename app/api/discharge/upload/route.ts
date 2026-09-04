import { NextResponse } from "next/server";
import { ingestDischargeWorkbookBuffer } from "@/lib/discharge-ingest";
import {
  calculateOverallStat,
  NOTICE_RATE_TARGET_PERCENT,
  COMPLETION_RATE_TARGET_PERCENT,
} from "@/lib/discharge-targets";
import { getPeriodComparison } from "@/lib/discharge-comparison";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "엑셀 파일이 없습니다." }, { status: 400 });
  }

  // 기준 연월은 사용자가 입력하지 않고, 엑셀 파일 안의 "조회년월 : YYYY-MM" 표기에서 자동으로 읽는다.
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await ingestDischargeWorkbookBuffer(buffer);

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  const overall = calculateOverallStat(result.parsed.departmentStats);

  let comparison = null;
  let comparisonError: string | undefined;
  try {
    comparison = await getPeriodComparison(result.period, overall);
  } catch (error) {
    comparisonError =
      error instanceof Error ? error.message : "알 수 없는 오류로 전월·전년 비교를 불러오지 못했습니다.";
  }

  return NextResponse.json({
    ok: true,
    period: result.period,
    sheetName: result.sheetName,
    saved: result.saved,
    saveError: result.saveError,
    ignoredPiiColumns: result.ignoredPiiColumns,
    overall,
    targets: {
      noticeRatePercent: NOTICE_RATE_TARGET_PERCENT,
      completionRatePercent: COMPLETION_RATE_TARGET_PERCENT,
    },
    comparison,
    comparisonError,
    ...result.parsed,
  });
}
