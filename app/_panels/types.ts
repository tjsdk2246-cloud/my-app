// 메인 화면에서 화면 이동 없이 카테고리를 전환할 때 쓰는 공통 타입.
// onNavigate가 주어지면(=메인 화면에 끼워 넣어 쓰는 경우) 페이지 이동 대신 탭을 전환하고,
// 주어지지 않으면(=단독 페이지로 접속한 경우) 기존처럼 <Link>로 이동한다.
export type PanelCategory = "upload" | "report" | "departments" | "doctors";

export type PanelNavProps = {
  initialPeriod?: string;
  onPeriodChange?: (period: string) => void;
  onNavigate?: (target: PanelCategory, period?: string) => void;
};
