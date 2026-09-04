"use client";

import { useState } from "react";
import Image from "next/image";
import UploadPanel from "@/app/_panels/UploadPanel";
import ReportPanel from "@/app/_panels/ReportPanel";
import DepartmentsPanel from "@/app/_panels/DepartmentsPanel";
import DoctorsPanel from "@/app/_panels/DoctorsPanel";
import type { PanelCategory } from "@/app/_panels/types";

const CATEGORIES: { key: PanelCategory; label: string }[] = [
  { key: "upload", label: "엑셀 업로드" },
  { key: "report", label: "퇴원예고 리포트" },
  { key: "departments", label: "진료과별 통계" },
  { key: "doctors", label: "의사별 통계" },
];

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<PanelCategory | null>(null);
  const [period, setPeriod] = useState<string | undefined>(undefined);

  function handleNavigate(target: PanelCategory, targetPeriod?: string) {
    setActiveCategory(target);
    if (targetPeriod) setPeriod(targetPeriod);
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <div className="flex w-full items-center justify-between border-b border-black/[.08] px-6 py-4 dark:border-white/[.145]">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="한양대학교병원 로고" width={120} height={32} className="h-8 w-auto" />
          <h1 className="text-lg font-semibold text-black dark:text-zinc-50">퇴원예고통계 관리</h1>
        </div>
        <form action="/api/logout" method="POST">
          <button
            type="submit"
            className="text-sm text-zinc-500 underline hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            로그아웃
          </button>
        </form>
      </div>

      <main className="flex flex-1 gap-6 p-6">
        <nav className="h-fit w-56 shrink-0 overflow-hidden rounded-xl border border-black/[.08] bg-white dark:border-white/[.145] dark:bg-zinc-900">
          <ul className="flex flex-col">
            {CATEGORIES.map((category, index) => {
              const isActive = activeCategory === category.key;
              return (
                <li key={category.key}>
                  <button
                    type="button"
                    onClick={() => setActiveCategory(category.key)}
                    className={`block w-full px-5 py-3 text-left text-sm transition-colors ${
                      isActive
                        ? "bg-teal-600 font-medium text-white"
                        : "text-black hover:bg-black/[.04] dark:text-zinc-50 dark:hover:bg-white/[.08]"
                    } ${index > 0 ? "border-t border-black/[.08] dark:border-white/[.145]" : ""}`}
                  >
                    {category.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex flex-1 flex-col items-start rounded-xl border border-black/[.08] bg-white p-8 dark:border-white/[.145] dark:bg-zinc-900">
          {activeCategory === null && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                왼쪽 카테고리에서 원하는 화면을 선택하세요.
              </p>
              <ul className="mt-2 flex flex-col gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li>· 엑셀 업로드 — 퇴원 엑셀 파일을 올려서 통계를 계산합니다</li>
                <li>· 퇴원예고 리포트 — 최신 연월 리포트를 바로 확인합니다</li>
                <li>· 진료과별 통계 — 진료과별 시간대·사유 통계를 확인합니다</li>
                <li>· 의사별 통계 — 의사별 퇴원예고율·완결률을 확인합니다</li>
              </ul>
            </div>
          )}
          {activeCategory === "upload" && (
            <UploadPanel onPeriodChange={setPeriod} onNavigate={handleNavigate} />
          )}
          {activeCategory === "report" && (
            <ReportPanel initialPeriod={period} onPeriodChange={setPeriod} onNavigate={handleNavigate} />
          )}
          {activeCategory === "departments" && (
            <DepartmentsPanel initialPeriod={period} onPeriodChange={setPeriod} onNavigate={handleNavigate} />
          )}
          {activeCategory === "doctors" && (
            <DoctorsPanel initialPeriod={period} onPeriodChange={setPeriod} onNavigate={handleNavigate} />
          )}
        </div>
      </main>
    </div>
  );
}
