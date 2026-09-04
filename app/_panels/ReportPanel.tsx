"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { formatPercent, formatDiff } from "@/lib/format-percent";
import type { PanelNavProps } from "./types";
import { usePeriodList } from "./usePeriodList";
import DiffCell from "./DiffCell";

type DepartmentStat = {
  department: string;
  totalDischarges: number;
  noticedCount: number;
  completedCount: number;
  noticeRatePercent: number | null;
  completionRatePercent: number | null;
};

type HourlyStat = { hour: number; count: number };
type ReasonStat = { reason: string; count: number };

type OverallStat = {
  noticeRatePercent: number | null;
  completionRatePercent: number | null;
  noticeTargetMet: boolean | null;
  completionTargetMet: boolean | null;
};

type Targets = { noticeRatePercent: number; completionRatePercent: number };

type PeriodComparisonPoint = {
  period: string;
  noticeRatePercent: number | null;
  completionRatePercent: number | null;
};

type RateDiff = { noticeRatePercent: number | null; completionRatePercent: number | null };

type PeriodComparison = {
  current: PeriodComparisonPoint;
  previousMonth: PeriodComparisonPoint | null;
  previousMonthDiff: RateDiff | null;
  previousYear: PeriodComparisonPoint | null;
  previousYearDiff: RateDiff | null;
};

type ReportResult = {
  ok: boolean;
  message?: string;
  period?: string;
  overall?: OverallStat;
  targets?: Targets;
  comparison?: PeriodComparison | null;
  comparisonError?: string;
  departmentStats?: DepartmentStat[];
  doctorStats?: unknown[];
  hourlyStats?: HourlyStat[];
  reasonStats?: ReasonStat[];
  departmentHourlyStats?: unknown[];
  departmentReasonStats?: unknown[];
};

// 목표 달성 여부를 색으로도 바로 구분할 수 있게 보여준다.
function TargetStatus({ met }: { met: boolean | null }) {
  if (met === null) return <p className="text-xs text-zinc-400 dark:text-zinc-500">데이터 없음</p>;
  return (
    <p
      className={`text-xs font-medium ${
        met ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"
      }`}
    >
      {met ? "목표 달성" : "목표 미달성"}
    </p>
  );
}

export default function ReportPanel({ initialPeriod, onPeriodChange, onNavigate }: PanelNavProps) {
  const [period, setPeriod] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  async function fetchReport(targetPeriod: string) {
    setPeriod(targetPeriod);
    setLoading(true);
    setHasSearched(true);

    const response = await fetch(`/api/discharge/report?period=${encodeURIComponent(targetPeriod)}`);
    const data = (await response.json().catch(() => null)) as ReportResult | null;

    setLoading(false);
    setResult(data ?? { ok: false, message: "서버 응답을 읽을 수 없습니다." });
    if (data?.ok) onPeriodChange?.(targetPeriod);
  }

  const availablePeriods = usePeriodList(initialPeriod, fetchReport);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!period) return;
    fetchReport(period);
  }

  const hourlyWithData = result?.hourlyStats?.filter((stat) => stat.count > 0) ?? [];
  const hourlyTotal = hourlyWithData.reduce((sum, stat) => sum + stat.count, 0);
  const reasonTotal = (result?.reasonStats ?? []).reduce((sum, stat) => sum + stat.count, 0);

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 rounded-xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-900"
      >
        <label className="flex flex-1 flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          조회할 연월
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            disabled={availablePeriods.length === 0}
            className="rounded-md border border-black/[.08] px-3 py-2 text-black outline-none focus:border-zinc-500 disabled:opacity-60 dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
          >
            <option value="">
              {availablePeriods.length === 0 ? "저장된 데이터가 없습니다" : "연월을 선택하세요"}
            </option>
            {availablePeriods.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={loading || !period}
          className="rounded-full bg-foreground px-5 py-2 text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
        >
          {loading ? "조회 중..." : "조회"}
        </button>
      </form>

      {availablePeriods.length === 0 &&
        (onNavigate ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            아직 업로드된 데이터가 없습니다.{" "}
            <button type="button" onClick={() => onNavigate("upload")} className="underline">
              먼저 엑셀을 업로드해 주세요
            </button>
            .
          </p>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            아직 업로드된 데이터가 없습니다.{" "}
            <Link href="/upload" className="underline">
              먼저 엑셀을 업로드해 주세요
            </Link>
            .
          </p>
        ))}

      {hasSearched && !loading && result && !result.ok && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {result.message ?? "리포트를 불러오지 못했습니다."}
        </div>
      )}

      {result?.ok && (
        <div className="flex flex-col gap-4 rounded-xl border border-black/[.08] bg-white p-4 text-sm text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50">
          <h1 className="text-lg font-semibold">{result.period} 퇴원예고 리포트</h1>

          {result.overall && result.targets && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-black/[.08] p-3 dark:border-white/[.145]">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">퇴원예고율</p>
                <p className="text-lg font-semibold">
                  {formatPercent(result.overall.noticeRatePercent)}{" "}
                  <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                    (목표 {result.targets.noticeRatePercent}% 이상)
                  </span>
                </p>
                <TargetStatus met={result.overall.noticeTargetMet} />
              </div>
              <div className="rounded-lg border border-black/[.08] p-3 dark:border-white/[.145]">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">퇴원예고완결률</p>
                <p className="text-lg font-semibold">
                  {formatPercent(result.overall.completionRatePercent)}{" "}
                  <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                    (목표 {result.targets.completionRatePercent}% 이상)
                  </span>
                </p>
                <TargetStatus met={result.overall.completionTargetMet} />
              </div>
            </div>
          )}

          <div>
            <p className="mb-1 font-medium">진료과별 통계 (증감은 퇴원예고율-퇴원예고완결률 격차, ±5%p 이상은 빨간색)</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-black/[.08] dark:border-white/[.145]">
                    <th className="py-1 pr-2">진료과</th>
                    <th className="py-1 pr-2">퇴원 건수</th>
                    <th className="py-1 pr-2">퇴원예고율</th>
                    <th className="py-1 pr-2">퇴원예고완결률</th>
                    <th className="py-1 pr-2">증감</th>
                  </tr>
                </thead>
                <tbody>
                  {result.departmentStats?.map((stat) => {
                    const gap =
                      stat.noticeRatePercent === null || stat.completionRatePercent === null
                        ? null
                        : Math.round((stat.completionRatePercent - stat.noticeRatePercent) * 10) / 10;
                    return (
                      <tr key={stat.department} className="border-b border-black/[.04] dark:border-white/[.08]">
                        <td className="py-1 pr-2">{stat.department}</td>
                        <td className="py-1 pr-2">{stat.totalDischarges}</td>
                        <td className="py-1 pr-2">{formatPercent(stat.noticeRatePercent)}</td>
                        <td className="py-1 pr-2">{formatPercent(stat.completionRatePercent)}</td>
                        <td className="py-1 pr-2">
                          <DiffCell value={gap} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 font-medium">시간대별 퇴실 건수</p>
              {hourlyWithData.length > 0 ? (
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-black/[.08] dark:border-white/[.145]">
                        <th className="py-1 pr-2">시간대</th>
                        <th className="py-1 pr-2">건수</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-black/[.08] bg-green-50 font-bold dark:border-white/[.145] dark:bg-green-950">
                        <td className="py-1 pr-2">합계</td>
                        <td className="py-1 pr-2">{hourlyTotal}</td>
                      </tr>
                      {hourlyWithData.map((stat) => (
                        <tr key={stat.hour} className="border-b border-black/[.04] dark:border-white/[.08]">
                          <td className="py-1 pr-2">{stat.hour}시</td>
                          <td className="py-1 pr-2">{stat.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs">데이터 없음</p>
              )}
            </div>

            <div>
              <p className="mb-1 font-medium">퇴원예고 사유별 건수</p>
              {(result.reasonStats?.length ?? 0) > 0 ? (
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-black/[.08] dark:border-white/[.145]">
                        <th className="py-1 pr-2">사유</th>
                        <th className="py-1 pr-2">건수</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-black/[.08] bg-green-50 font-bold dark:border-white/[.145] dark:bg-green-950">
                        <td className="py-1 pr-2">합계</td>
                        <td className="py-1 pr-2">{reasonTotal}</td>
                      </tr>
                      {result.reasonStats
                        ?.slice()
                        .sort((a, b) => b.count - a.count)
                        .map((stat) => (
                          <tr key={stat.reason} className="border-b border-black/[.04] dark:border-white/[.08]">
                            <td className="py-1 pr-2">{stat.reason}</td>
                            <td className="py-1 pr-2">{stat.count}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs">데이터 없음</p>
              )}
            </div>
          </div>

          {result.comparison && (
            <div>
              <p className="mb-1 font-medium">전월·전년 대비 비교 (병원 전체, 이상 징후 판정 없음)</p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-black/[.08] dark:border-white/[.145]">
                      <th className="py-1 pr-2">기준</th>
                      <th className="py-1 pr-2">퇴원예고율</th>
                      <th className="py-1 pr-2">퇴원예고완결률</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-black/[.04] bg-green-50 dark:border-white/[.08] dark:bg-green-950">
                      <td className="py-1 pr-2">당월 ({result.comparison.current.period})</td>
                      <td className="py-1 pr-2">{formatPercent(result.comparison.current.noticeRatePercent)}</td>
                      <td className="py-1 pr-2">
                        {formatPercent(result.comparison.current.completionRatePercent)}
                      </td>
                    </tr>
                    <tr className="border-b border-black/[.04] dark:border-white/[.08]">
                      <td className="py-1 pr-2">
                        전월
                        {result.comparison.previousMonth ? ` (${result.comparison.previousMonth.period})` : ""}
                      </td>
                      <td className="py-1 pr-2">
                        {formatPercent(result.comparison.previousMonth?.noticeRatePercent ?? null)}
                        {formatDiff(result.comparison.previousMonthDiff?.noticeRatePercent ?? null)}
                      </td>
                      <td className="py-1 pr-2">
                        {formatPercent(result.comparison.previousMonth?.completionRatePercent ?? null)}
                        {formatDiff(result.comparison.previousMonthDiff?.completionRatePercent ?? null)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-2">
                        전년 동월
                        {result.comparison.previousYear ? ` (${result.comparison.previousYear.period})` : ""}
                      </td>
                      <td className="py-1 pr-2">
                        {formatPercent(result.comparison.previousYear?.noticeRatePercent ?? null)}
                        {formatDiff(result.comparison.previousYearDiff?.noticeRatePercent ?? null)}
                      </td>
                      <td className="py-1 pr-2">
                        {formatPercent(result.comparison.previousYear?.completionRatePercent ?? null)}
                        {formatDiff(result.comparison.previousYearDiff?.completionRatePercent ?? null)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
