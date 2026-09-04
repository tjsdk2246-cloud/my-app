import { getDischargeStats } from "@/lib/discharge-storage";
import { calculateOverallStat, type OverallStat } from "@/lib/discharge-targets";

export type PeriodComparisonPoint = {
  period: string;
  noticeRatePercent: number | null;
  completionRatePercent: number | null;
};

export type RateDiff = {
  noticeRatePercent: number | null;
  completionRatePercent: number | null;
};

export type PeriodComparison = {
  current: PeriodComparisonPoint;
  // null = 비교할 달의 데이터가 서버에 아예 저장돼 있지 않음 ("데이터 없음")
  previousMonth: PeriodComparisonPoint | null;
  previousMonthDiff: RateDiff | null;
  previousYear: PeriodComparisonPoint | null;
  previousYearDiff: RateDiff | null;
};

// "2026-07" 같은 문자열을 monthsDelta개월만큼 옮긴 "YYYY-MM" 문자열로 바꾼다.
function shiftPeriod(period: string, monthsDelta: number): string {
  const [yearStr, monthStr] = period.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const totalMonths = year * 12 + (month - 1) + monthsDelta;
  const newYear = Math.floor(totalMonths / 12);
  const newMonth = (totalMonths % 12) + 1;
  return `${newYear}-${String(newMonth).padStart(2, "0")}`;
}

function diffOrNull(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null;
  return Math.round((current - previous) * 10) / 10;
}

async function loadComparisonPoint(period: string): Promise<PeriodComparisonPoint | null> {
  const stored = await getDischargeStats(period);
  if (!stored) return null;

  const stat = calculateOverallStat(stored.departmentStats);
  return {
    period,
    noticeRatePercent: stat.noticeRatePercent,
    completionRatePercent: stat.completionRatePercent,
  };
}

// 이상 징후 판정은 하지 않는다(이 프로젝트의 범위 밖). 전월·전년 동월 수치와
// 그 차이(퍼센트포인트)만 계산해서 보여준다. 비교할 데이터가 없으면 null로 남긴다.
export async function getPeriodComparison(
  period: string,
  currentOverall: OverallStat,
): Promise<PeriodComparison> {
  const previousMonthPeriod = shiftPeriod(period, -1);
  const previousYearPeriod = shiftPeriod(period, -12);

  const [previousMonth, previousYear] = await Promise.all([
    loadComparisonPoint(previousMonthPeriod),
    loadComparisonPoint(previousYearPeriod),
  ]);

  const current: PeriodComparisonPoint = {
    period,
    noticeRatePercent: currentOverall.noticeRatePercent,
    completionRatePercent: currentOverall.completionRatePercent,
  };

  return {
    current,
    previousMonth,
    previousMonthDiff: previousMonth
      ? {
          noticeRatePercent: diffOrNull(current.noticeRatePercent, previousMonth.noticeRatePercent),
          completionRatePercent: diffOrNull(
            current.completionRatePercent,
            previousMonth.completionRatePercent,
          ),
        }
      : null,
    previousYear,
    previousYearDiff: previousYear
      ? {
          noticeRatePercent: diffOrNull(current.noticeRatePercent, previousYear.noticeRatePercent),
          completionRatePercent: diffOrNull(
            current.completionRatePercent,
            previousYear.completionRatePercent,
          ),
        }
      : null,
  };
}
