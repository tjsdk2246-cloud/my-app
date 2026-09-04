"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import type { PanelNavProps } from "./types";
import { usePeriodList } from "./usePeriodList";

type DepartmentStat = { department: string };
type DepartmentHourlyStat = { department: string; hour: number; count: number };
type DepartmentReasonStat = { department: string; reason: string; count: number };

type ReportResult = {
  ok: boolean;
  message?: string;
  period?: string;
  departmentStats?: DepartmentStat[];
  departmentHourlyStats?: DepartmentHourlyStat[];
  departmentReasonStats?: DepartmentReasonStat[];
};

// 외부 차트 라이브러리 없이 막대그래프를 그리는 작은 컴포넌트.
function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="flex h-56 items-end gap-2 overflow-x-auto border-b border-black/[.08] pb-1 dark:border-white/[.145]">
      {data.map((d) => (
        <div key={d.label} className="flex h-full min-w-[36px] flex-col items-center justify-end">
          <span className="mb-1 text-[10px] text-zinc-500 dark:text-zinc-400">{d.value}</span>
          <div
            className="w-5 rounded-t bg-sky-400 dark:bg-sky-500"
            style={{ height: `${(d.value / max) * 100}%` }}
          />
          <span className="mt-1 max-w-[64px] text-center text-[10px] leading-tight text-zinc-500 dark:text-zinc-400">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function DepartmentsPanel({ initialPeriod, onPeriodChange, onNavigate }: PanelNavProps) {
  const [period, setPeriod] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  async function fetchReport(targetPeriod: string) {
    setPeriod(targetPeriod);
    setDepartment("");
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

  const hourlyForDepartment =
    result?.departmentHourlyStats?.filter((stat) => stat.department === department && stat.count > 0) ?? [];
  const reasonForDepartment = (
    result?.departmentReasonStats?.filter((stat) => stat.department === department) ?? []
  )
    .slice()
    .sort((a, b) => b.count - a.count);

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
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
          <h1 className="text-lg font-semibold">{result.period} 진료과별 상세</h1>

          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            진료과 선택
            <select
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              className="rounded-md border border-black/[.08] px-3 py-2 text-black outline-none focus:border-zinc-500 dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
            >
              <option value="">진료과를 선택하세요</option>
              {result.departmentStats?.map((stat) => (
                <option key={stat.department} value={stat.department}>
                  {stat.department}
                </option>
              ))}
            </select>
          </label>

          {department && (
            <div className="flex flex-col gap-6">
              <div>
                <p className="mb-2 font-medium">{department} — 시간대별 퇴실 건수</p>
                {hourlyForDepartment.length > 0 ? (
                  <>
                    <BarChart
                      data={hourlyForDepartment.map((stat) => ({
                        label: `${stat.hour}시`,
                        value: stat.count,
                      }))}
                    />
                    <div className="mt-2 max-h-48 overflow-y-auto">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="border-b border-black/[.08] dark:border-white/[.145]">
                            <th className="py-1 pr-2">시간대</th>
                            <th className="py-1 pr-2">건수</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hourlyForDepartment.map((stat) => (
                            <tr key={stat.hour} className="border-b border-black/[.04] dark:border-white/[.08]">
                              <td className="py-1 pr-2">{stat.hour}시</td>
                              <td className="py-1 pr-2">{stat.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="text-xs">데이터 없음</p>
                )}
              </div>

              <div>
                <p className="mb-2 font-medium">{department} — 퇴원예고 사유별 건수</p>
                {reasonForDepartment.length > 0 ? (
                  <>
                    <BarChart
                      data={reasonForDepartment.map((stat) => ({
                        label: stat.reason,
                        value: stat.count,
                      }))}
                    />
                    <div className="mt-2 max-h-48 overflow-y-auto">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="border-b border-black/[.08] dark:border-white/[.145]">
                            <th className="py-1 pr-2">사유</th>
                            <th className="py-1 pr-2">건수</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reasonForDepartment.map((stat) => (
                            <tr key={stat.reason} className="border-b border-black/[.04] dark:border-white/[.08]">
                              <td className="py-1 pr-2">{stat.reason}</td>
                              <td className="py-1 pr-2">{stat.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="text-xs">데이터 없음</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
