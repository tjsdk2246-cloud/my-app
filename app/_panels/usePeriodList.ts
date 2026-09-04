"use client";

import { useEffect, useState } from "react";

// 저장된 연월 목록을 불러오고, 명시된 연월(주소창의 ?period= 값 또는 다른 탭에서 넘어온 연월)이
// 없으면 가장 최신 연월을 기본으로 골라 바로 조회한다.
export function usePeriodList(initialPeriod: string | undefined, fetchReport: (period: string) => void) {
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const response = await fetch("/api/discharge/periods");
      const data = (await response.json().catch(() => null)) as { ok: boolean; periods?: string[] } | null;
      const periods = data?.ok && data.periods ? data.periods : [];
      if (cancelled) return;

      setAvailablePeriods(periods);

      const fromQuery = new URLSearchParams(window.location.search).get("period");
      const target = initialPeriod ?? fromQuery ?? periods[0];
      if (target) fetchReport(target);
    }

    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return availablePeriods;
}
