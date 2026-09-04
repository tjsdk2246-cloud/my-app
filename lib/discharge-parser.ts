import type ExcelJS from "exceljs";
import { cellToText, getHeaderTexts } from "@/lib/excel-text";

// 실제 EHR 엑셀 컬럼명. 계산에 꼭 필요한 컬럼만 필수로 요구한다.
// 환자등록번호 등 다른 컬럼이 파일에 더 있어도 상관없다 — 아래 로직은 이름으로 지정한
// 컬럼만 골라 읽으므로, 여기 없는 컬럼(개인정보 포함)은 애초에 값을 읽지도 저장하지도 않는다.
export const REQUIRED_COLUMNS = [
  "진료과",
  "퇴원예고일시",
  "퇴실일시",
  "입원일자",
  "퇴원일자",
  "퇴실지연사유",
  "가퇴원여부",
  "퇴원결과",
] as const;

const NO_DATA = "데이터 없음";

// "퇴실지연사유" 컬럼은 텍스트가 아니라 코드(숫자)로 들어있다. 실제 병원에서 알려준 코드표.
const REASON_CODE_LABELS: Record<string, string> = {
  "1": "퇴원결정지연",
  "2": "보호자늦게와서",
  "3": "검사결과확인",
  "4": "협진후",
  "5": "회진후",
  "6": "환자퇴원거절",
  "7": "투약, 처치, 검사시행후",
  "8": "전원(타병원)미준비",
  "9": "기타",
};

function resolveReasonLabel(rawValue: string): string {
  const trimmed = rawValue.trim();
  if (!trimmed) return NO_DATA;
  return REASON_CODE_LABELS[trimmed] ?? trimmed;
}

// "가퇴원여부" 컬럼에서 "예"로 볼 수 있는 표현들.
// ⚠️ 실제 파일의 값 표기(예: "Y"/"N", "예"/"아니오" 등)를 보고 조정이 필요할 수 있다.
const YES_VALUES = new Set(["예", "y", "yes", "true", "1", "가퇴원", "o"]);

function isYes(value: string) {
  return YES_VALUES.has(value.trim().toLowerCase());
}

function isDeath(outcome: string) {
  return outcome.includes("사망");
}

function parseDateValue(value: ExcelJS.CellValue): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const text = cellToText(value).trim();
  if (!text) return null;

  // "2026-07-01 09:00" 같은 표기를 로컬 시간 기준 ISO 형식으로 바꿔 더 안정적으로 파싱한다.
  const isoLike = text.includes("T") ? text : text.replace(" ", "T");
  const parsed = new Date(isoLike);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isSameCalendarDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

// "12시 이전" 뿐 아니라 12시 정각도 완결로 본다 (사용자 확인 사항).
function isBeforeOrAtNoon(date: Date) {
  return date.getHours() < 12 || (date.getHours() === 12 && date.getMinutes() === 0);
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

// 실제 EHR 출력물 위쪽에 "조회년월 : 2026-07"처럼 이 파일의 기준 연월이 이미 적혀 있어서,
// 사용자가 따로 입력하지 않아도 파일에서 바로 읽어온다.
const PERIOD_LABEL_PATTERN = /조회년월\s*[:：]\s*(\d{4}-(?:0[1-9]|1[0-2]))/;

export function extractPeriodFromSheet(sheet: ExcelJS.Worksheet, maxRowsToScan = 10): string | null {
  const limit = Math.min(maxRowsToScan, sheet.rowCount);
  for (let rowNumber = 1; rowNumber <= limit; rowNumber += 1) {
    for (const text of getHeaderTexts(sheet.getRow(rowNumber))) {
      const match = text.match(PERIOD_LABEL_PATTERN);
      if (match) return match[1];
    }
  }
  return null;
}

// 실제 EHR 출력물은 제목·출력일시 같은 안내 줄이 몇 줄 있고 그 아래에 진짜 헤더가 온다.
// 그래서 1행을 무조건 헤더로 보지 않고, 필수 컬럼명이 절반 이상 나오는 첫 번째 줄을 헤더로 찾는다.
export function findHeaderRow(
  sheet: ExcelJS.Worksheet,
  maxRowsToScan = 20,
): { rowNumber: number; headers: string[] } | null {
  const limit = Math.min(maxRowsToScan, sheet.rowCount);
  for (let rowNumber = 1; rowNumber <= limit; rowNumber += 1) {
    const headers = getHeaderTexts(sheet.getRow(rowNumber)).map((text) => text.trim());
    const matchCount = REQUIRED_COLUMNS.filter((column) => headers.includes(column)).length;
    if (matchCount >= Math.ceil(REQUIRED_COLUMNS.length / 2)) {
      return { rowNumber, headers };
    }
  }
  return null;
}

function buildColumnIndex(headerRow: ExcelJS.Row) {
  const columnIndexByName = new Map<string, number>();
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const name = cellToText(cell.value).trim();
    if (name) columnIndexByName.set(name, colNumber);
  });
  return columnIndexByName;
}

function requireColumnIndex(columnIndexByName: Map<string, number>, name: string): number {
  const index = columnIndexByName.get(name);
  if (index === undefined) {
    throw new Error(`필수 컬럼(${name})을 찾을 수 없습니다.`);
  }
  return index;
}

type Accumulator = { total: number; noticed: number; eligible: number; completed: number };

function emptyAcc(): Accumulator {
  return { total: 0, noticed: 0, eligible: 0, completed: 0 };
}

function toRateStat(acc: Accumulator) {
  return {
    totalDischarges: acc.total,
    noticedCount: acc.noticed,
    completionEligibleCount: acc.eligible,
    completedCount: acc.completed,
    // null = "데이터 없음" (분모가 0이라 계산할 수 없음. 추정하지 않는다)
    noticeRatePercent: acc.total > 0 ? round1((acc.noticed / acc.total) * 100) : null,
    completionRatePercent: acc.eligible > 0 ? round1((acc.completed / acc.eligible) * 100) : null,
  };
}

export type RateStat = ReturnType<typeof toRateStat>;
export type DepartmentStat = RateStat & { department: string };
export type DoctorStat = RateStat & { doctorId: string; doctorName: string };

export type HourlyStat = { hour: number; count: number };
export type ReasonStat = { reason: string; count: number };
export type DepartmentHourlyStat = { department: string; hour: number; count: number };
export type DepartmentReasonStat = { department: string; reason: string; count: number };

export type ParsedDischargeData = {
  totalRows: number;
  // 퇴실일시가 없어(아직 재원 중이라) 이번 집계에서 제외된 행 수. 추정해서 채우지 않고 별도로 알려준다.
  notYetDischargedCount: number;
  departmentStats: DepartmentStat[];
  doctorStats: DoctorStat[];
  // 의사명·의사ID 컬럼이 파일에 없으면 의사별 통계를 만들지 않는다 (업로드 자체는 막지 않는다).
  hasDoctorColumns: boolean;
  hourlyStats: HourlyStat[];
  reasonStats: ReasonStat[];
  // 진료과별로 나눈 시간대별·사유별 통계 (진료과 상세 화면용)
  departmentHourlyStats: DepartmentHourlyStat[];
  departmentReasonStats: DepartmentReasonStat[];
};

// 퇴원예고율 = 퇴원예고일시가 있는 건수 / 전체 퇴원 건수
// 퇴원예고완결률 = (퇴원예고가 있었고, 당일입퇴원·가퇴원이 아니면서, 사망이 아니고
//                 퇴실일시가 12시 이전이거나 정각인 건수) / (당일입퇴원·가퇴원이 아닌 전체 건수)
// → 분모는 "예고 여부"와 상관없이 당일입퇴원·가퇴원만 제외한 전체 건수다.
//   (예고를 안 했으면 애초에 분자 조건을 만족할 수 없으니 자동으로 미완결로 잡힌다.)
export function parseDischargeSheet(sheet: ExcelJS.Worksheet): ParsedDischargeData {
  const headerInfo = findHeaderRow(sheet);
  const headerRowNumber = headerInfo?.rowNumber ?? 1;
  const columnIndexByName = buildColumnIndex(sheet.getRow(headerRowNumber));

  const departmentCol = requireColumnIndex(columnIndexByName, "진료과");
  const noticeCol = requireColumnIndex(columnIndexByName, "퇴원예고일시");
  const actualCol = requireColumnIndex(columnIndexByName, "퇴실일시");
  const admissionCol = requireColumnIndex(columnIndexByName, "입원일자");
  const dischargeDateCol = requireColumnIndex(columnIndexByName, "퇴원일자");
  const reasonCol = requireColumnIndex(columnIndexByName, "퇴실지연사유");
  const tempDischargeCol = requireColumnIndex(columnIndexByName, "가퇴원여부");
  const outcomeCol = requireColumnIndex(columnIndexByName, "퇴원결과");

  const doctorNameColRaw = columnIndexByName.get("의사명");
  const doctorIdColRaw = columnIndexByName.get("의사ID");
  const doctorCols =
    doctorNameColRaw !== undefined && doctorIdColRaw !== undefined
      ? { name: doctorNameColRaw, id: doctorIdColRaw }
      : null;

  const departmentMap = new Map<string, Accumulator>();
  const doctorMap = new Map<string, { doctorId: string; doctorName: string; acc: Accumulator }>();
  const hourlyCounts = new Map<number, number>();
  const reasonCounts = new Map<string, number>();
  const departmentHourlyCounts = new Map<string, Map<number, number>>();
  const departmentReasonCounts = new Map<string, Map<string, number>>();
  let totalRows = 0;
  let notYetDischargedCount = 0;

  function bump<K>(map: Map<string, Map<K, number>>, department: string, subKey: K) {
    const inner = map.get(department) ?? new Map<K, number>();
    inner.set(subKey, (inner.get(subKey) ?? 0) + 1);
    map.set(department, inner);
  }

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowNumber) return; // 헤더 및 그 위 제목·안내 행은 건너뜀
    if (row.actualCellCount === 0) return; // 완전히 빈 행은 건너뜀

    totalRows += 1;

    const department = cellToText(row.getCell(departmentCol).value).trim() || NO_DATA;
    const reason = resolveReasonLabel(cellToText(row.getCell(reasonCol).value));
    const noticeDate = parseDateValue(row.getCell(noticeCol).value);
    const actualDate = parseDateValue(row.getCell(actualCol).value);
    const admissionDate = parseDateValue(row.getCell(admissionCol).value);
    const dischargeDate = parseDateValue(row.getCell(dischargeDateCol).value);
    const tempDischarge = isYes(cellToText(row.getCell(tempDischargeCol).value));
    const outcome = cellToText(row.getCell(outcomeCol).value).trim();
    const death = isDeath(outcome);

    reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
    bump(departmentReasonCounts, department, reason);

    // 실제로 퇴실한 건만 "퇴원 건수"로 센다. 아직 퇴실하지 않은 건은
    // 이번 달 예고율·완결률 계산 대상에서 빼고, 몇 건인지 별도로 알려준다.
    if (!actualDate) {
      notYetDischargedCount += 1;
      return;
    }

    // 당일 입퇴원: 입원일자와 퇴원일자가 같은 날. 둘 중 하나라도 못 읽으면 판단할 수 없으므로
    // (추정하지 않고) 당일입퇴원이 아닌 것으로 둔다.
    const sameDayAdmission =
      admissionDate !== null && dischargeDate !== null && isSameCalendarDay(admissionDate, dischargeDate);
    const excludedFromCompletion = tempDischarge || sameDayAdmission;

    const noticed = noticeDate !== null;
    // 완결률 분모는 당일입퇴원·가퇴원만 제외한 전체 건수 — 예고 여부와 무관하다.
    const eligibleForCompletion = !excludedFromCompletion;
    const completed = eligibleForCompletion && noticed && !death && isBeforeOrAtNoon(actualDate);

    function applyTo(acc: Accumulator) {
      acc.total += 1;
      if (noticed) acc.noticed += 1;
      if (eligibleForCompletion) {
        acc.eligible += 1;
        if (completed) acc.completed += 1;
      }
    }

    const deptAcc = departmentMap.get(department) ?? emptyAcc();
    applyTo(deptAcc);
    departmentMap.set(department, deptAcc);

    if (doctorCols) {
      const doctorId = cellToText(row.getCell(doctorCols.id).value).trim() || NO_DATA;
      const doctorName = cellToText(row.getCell(doctorCols.name).value).trim() || NO_DATA;
      const key = `${doctorId}|${doctorName}`;
      const entry = doctorMap.get(key) ?? { doctorId, doctorName, acc: emptyAcc() };
      applyTo(entry.acc);
      doctorMap.set(key, entry);
    }

    hourlyCounts.set(actualDate.getHours(), (hourlyCounts.get(actualDate.getHours()) ?? 0) + 1);
    bump(departmentHourlyCounts, department, actualDate.getHours());
  });

  const departmentStats: DepartmentStat[] = Array.from(departmentMap.entries()).map(
    ([department, acc]) => ({ department, ...toRateStat(acc) }),
  );

  const doctorStats: DoctorStat[] = Array.from(doctorMap.values()).map(({ doctorId, doctorName, acc }) => ({
    doctorId,
    doctorName,
    ...toRateStat(acc),
  }));

  const hourlyStats: HourlyStat[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: hourlyCounts.get(hour) ?? 0,
  }));

  const reasonStats: ReasonStat[] = Array.from(reasonCounts.entries()).map(([reason, count]) => ({
    reason,
    count,
  }));

  const departmentHourlyStats: DepartmentHourlyStat[] = Array.from(
    departmentHourlyCounts.entries(),
  ).flatMap(([department, hourMap]) =>
    Array.from(hourMap.entries()).map(([hour, count]) => ({ department, hour, count })),
  );

  const departmentReasonStats: DepartmentReasonStat[] = Array.from(
    departmentReasonCounts.entries(),
  ).flatMap(([department, reasonMap]) =>
    Array.from(reasonMap.entries()).map(([reason, count]) => ({ department, reason, count })),
  );

  return {
    totalRows,
    notYetDischargedCount,
    departmentStats,
    doctorStats,
    hasDoctorColumns: doctorCols !== null,
    hourlyStats,
    reasonStats,
    departmentHourlyStats,
    departmentReasonStats,
  };
}
