"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import type { PanelNavProps } from "./types";

type UploadResult = {
  ok: boolean;
  message?: string;
  period?: string;
  saved?: boolean;
  saveError?: string;
  ignoredPiiColumns?: string[];
};

export default function UploadPanel({ onPeriodChange, onNavigate }: PanelNavProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/discharge/upload", {
      method: "POST",
      body: formData,
    });
    const data = (await response.json().catch(() => null)) as UploadResult | null;

    setLoading(false);
    setResult(data ?? { ok: false, message: "서버 응답을 읽을 수 없습니다." });
    if (data?.ok && data.period) onPeriodChange?.(data.period);
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-xl border border-black/[.08] bg-white p-8 dark:border-white/[.145] dark:bg-zinc-900"
      >
        <h1 className="text-lg font-semibold text-black dark:text-zinc-50">퇴원 엑셀 업로드</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          엑셀 파일 1개를 선택해 주세요. 기준 연월은 파일 안 내용에서 자동으로 읽습니다.
        </p>

        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          엑셀 파일
          <input
            type="file"
            accept=".xlsx"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            required
            className="text-sm"
          />
        </label>

        <button
          type="submit"
          disabled={loading || !file}
          className="rounded-full bg-foreground px-5 py-2 text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
        >
          {loading ? "업로드 중..." : "업로드"}
        </button>
      </form>

      {result && !result.ok && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {result.message ?? "업로드에 실패했습니다."}
        </div>
      )}

      {result?.ok && (
        <div className="flex flex-col gap-2 rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          <p className="font-medium">업로드 성공 — 기준 연월: {result.period}</p>
          <p>
            {result.saved
              ? "다음 달 비교를 위해 서버에 저장했습니다."
              : `서버 저장에 실패했습니다${result.saveError ? `: ${result.saveError}` : ""}`}
          </p>
          {(result.ignoredPiiColumns?.length ?? 0) > 0 && (
            <p className="text-xs text-green-800/80 dark:text-green-300/80">
              개인정보로 보이는 항목({result.ignoredPiiColumns?.join(", ")})은 읽지 않고 무시했습니다.
            </p>
          )}
          {onNavigate ? (
            <button
              type="button"
              onClick={() => onNavigate("report", result.period)}
              className="mt-1 text-left font-medium underline"
            >
              {result.period} 리포트 보기 →
            </button>
          ) : (
            <Link
              href={`/report?period=${encodeURIComponent(result.period ?? "")}`}
              className="mt-1 font-medium underline"
            >
              {result.period} 리포트 보기 →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
