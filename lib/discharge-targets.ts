import type { RateStat } from "@/lib/discharge-parser";

// PRD.md 목표: 퇴원예고율 80% 이상, 퇴원예고완결률 60% 이상.
export const NOTICE_RATE_TARGET_PERCENT = 80;
export const COMPLETION_RATE_TARGET_PERCENT = 60;

export type OverallStat = {
  totalDischarges: number;
  noticedCount: number;
  completionEligibleCount: number;
  completedCount: number;
  // null = 분모가 0이라 계산할 수 없음("데이터 없음"). 추정하지 않는다.
  noticeRatePercent: number | null;
  completionRatePercent: number | null;
  noticeTargetMet: boolean | null;
  completionTargetMet: boolean | null;
};

// 여러 그룹(진료과별 또는 의사별) 통계를 합산해 병원 전체 기준 목표 대비 현황을 계산한다.
export function calculateOverallStat(groupStats: RateStat[]): OverallStat {
  const totals = groupStats.reduce(
    (acc, stat) => ({
      totalDischarges: acc.totalDischarges + stat.totalDischarges,
      noticedCount: acc.noticedCount + stat.noticedCount,
      completionEligibleCount: acc.completionEligibleCount + stat.completionEligibleCount,
      completedCount: acc.completedCount + stat.completedCount,
    }),
    { totalDischarges: 0, noticedCount: 0, completionEligibleCount: 0, completedCount: 0 },
  );

  const noticeRatePercent =
    totals.totalDischarges > 0
      ? Math.round((totals.noticedCount / totals.totalDischarges) * 1000) / 10
      : null;
  const completionRatePercent =
    totals.completionEligibleCount > 0
      ? Math.round((totals.completedCount / totals.completionEligibleCount) * 1000) / 10
      : null;

  return {
    ...totals,
    noticeRatePercent,
    completionRatePercent,
    noticeTargetMet: noticeRatePercent === null ? null : noticeRatePercent >= NOTICE_RATE_TARGET_PERCENT,
    completionTargetMet:
      completionRatePercent === null ? null : completionRatePercent >= COMPLETION_RATE_TARGET_PERCENT,
  };
}
