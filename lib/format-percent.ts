// 화면(클라이언트 컴포넌트)에서 공통으로 쓰는 표시용 포맷 함수.

export function formatPercent(value: number | null) {
  return value === null ? "데이터 없음" : `${value}%`;
}

export function formatTargetStatus(met: boolean | null) {
  if (met === null) return "데이터 없음";
  return met ? "목표 달성" : "목표 미달성";
}

export function formatDiff(value: number | null) {
  if (value === null) return "";
  if (value === 0) return " (전월/전년과 동일)";
  return ` (${value > 0 ? "+" : ""}${value}%p)`;
}
