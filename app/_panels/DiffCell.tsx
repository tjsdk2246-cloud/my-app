// 두 비율(예: 퇴원예고율과 퇴원예고완결률)의 격차를 "▼10%"처럼 화살표로 보여준다.
// 두 번째 값이 첫 번째 값보다 낮으면 ▼, 높으면 ▲. 차이가 ±5%p 이상이면 빨간 글씨로 강조한다.
export default function DiffCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-zinc-400 dark:text-zinc-500">데이터 없음</span>;
  if (value === 0) return <span className="text-zinc-400 dark:text-zinc-500">-</span>;

  const abs = Math.abs(value);
  const arrow = value > 0 ? "▲" : "▼";
  const isNotable = abs >= 5;

  return (
    <span className={isNotable ? "font-medium text-red-600 dark:text-red-400" : ""}>
      {arrow}
      {abs}%
    </span>
  );
}
