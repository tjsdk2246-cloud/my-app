"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { formatPercent } from "@/lib/format-percent";
import type { PanelNavProps } from "./types";
import { usePeriodList } from "./usePeriodList";
import DiffCell from "./DiffCell";

type DoctorStat = {
  doctorId: string;
  doctorName: string;
  department: string;
  totalDischarges: number;
  noticeRatePercent: number | null;
  completionRatePercent: number | null;
};

type DoctorReportResult = {
  ok: boolean;
  message?: string;
  period?: string;
  doctorStats?: DoctorStat[];
};

type SortField = "totalDischarges" | "noticeRatePercent" | "completionRatePercent";

export default function DoctorsPanel({ initialPeriod, onPeriodChange, onNavigate }: PanelNavProps) {
  const [period, setPeriod] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DoctorReportResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [sortField, setSortField] = useState<SortField>("totalDischarges");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((dir) => (dir === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  function sortArrow(field: SortField) {
    if (sortField !== field) return "";
    return sortDir === "desc" ? " ▼" : " ▲";
  }

  async function fetchReport(targetPeriod: string) {
    setPeriod(targetPeriod);
    setLoading(true);
    setHasSearched(true);

    const response = await fetch(`/api/discharge/report?period=${encodeURIComponent(targetPeriod)}`);
    const data = (await response.json().catch(() => null)) as DoctorReportResult | null;

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

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      {onNavigate ? (
        <button
          type="button"
          onClick={() => onNavigate("report", period || undefined)}
          className="self-start text-sm text-zinc-500 hover:underline dark:text-zinc-400"
        >
          ← 리포트로
        </button>
      ) : (
        <Link
          href={`/report${period ? `?period=${encodeURIComponent(period)}` : ""}`}
          className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
        >
          ← 리포트로
        </Link>
      )}

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

      {hasSearched && !loading && result && !result.ok && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {result.message ?? "리포트를 불러오지 못했습니다."}
        </div>
      )}

      {result?.ok && (
        <div className="flex flex-col gap-4 rounded-xl border border-black/[.08] bg-white p-4 text-sm text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50">
          <h1 className="text-lg font-semibold">{result.period} 의사별 통계</h1>

          {(result.doctorStats?.length ?? 0) === 0 ? (
            <p className="text-xs">데이터 없음 (이 달 파일에 의사명·의사ID 컬럼이 없었을 수 있습니다)</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-black/[.08] dark:border-white/[.145]">
                    <th className="py-1 pr-2">진료과</th>
                    <th className="py-1 pr-2">의사</th>
                    <th
                      className="cursor-pointer select-none py-1 pr-2"
                      onClick={() => toggleSort("totalDischarges")}
                    >
                      퇴원 건수{sortArrow("totalDischarges")}
                    </th>
                    <th
                      className="cursor-pointer select-none py-1 pr-2"
                      onClick={() => toggleSort("noticeRatePercent")}
                    >
                      퇴원예고율{sortArrow("noticeRatePercent")}
                    </th>
                    <th
                      className="cursor-pointer select-none py-1 pr-2"
                      onClick={() => toggleSort("completionRatePercent")}
                    >
                      퇴원예고완결률{sortArrow("completionRatePercent")}
                    </th>
                    <th className="py-1 pr-2">증감</th>
                  </tr>
                </thead>
                <tbody>
                  {result.doctorStats
                    ?.slice()
                    .sort((a, b) => {
                      const av = a[sortField];
                      const bv = b[sortField];
                      if (av === null && bv === null) return 0;
                      if (av === null) return 1;
                      if (bv === null) return -1;
                      return sortDir === "desc" ? bv - av : av - bv;
                    })
                    .map((stat) => {
                      const gap =
                        stat.noticeRatePercent === null || stat.completionRatePercent === null
                          ? null
                          : Math.round((stat.completionRatePercent - stat.noticeRatePercent) * 10) / 10;
                      return (
                        <tr
                          key={`${stat.doctorId}-${stat.doctorName}`}
                          className="border-b border-black/[.04] dark:border-white/[.08]"
                        >
                          <td className="py-1 pr-2">{stat.department}</td>
                          <td className="py-1 pr-2">
                            {stat.doctorName} ({stat.doctorId})
                          </td>
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
          )}
        </div>
      )}
    </div>
  );
}
