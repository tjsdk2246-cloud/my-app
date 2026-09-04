import ExcelJS from "exceljs";
import { getHeaderTexts } from "@/lib/excel-text";
import {
  REQUIRED_COLUMNS,
  parseDischargeSheet,
  findHeaderRow,
  extractPeriodFromSheet,
  type ParsedDischargeData,
} from "@/lib/discharge-parser";
import { findPiiColumns } from "@/lib/pii-check";
import { saveDischargeStats } from "@/lib/discharge-storage";

export type IngestResult =
  | {
      ok: true;
      period: string;
      sheetName: string;
      parsed: ParsedDischargeData;
      saved: boolean;
      saveError?: string;
      // 파일에 있었지만 읽지 않고 무시한 개인정보로 보이는 컬럼명(참고용, 값은 어디에도 저장되지 않는다).
      ignoredPiiColumns: string[];
    }
  | { ok: false; message: string };

function findMissingRequiredColumns(headers: string[]) {
  const normalizedHeaders = new Set(headers.map((header) => header.trim()));
  return REQUIRED_COLUMNS.filter((required) => !normalizedHeaders.has(required));
}

// 엑셀 파일(버퍼) 하나를 검증 → 파싱 → 저장까지 처리한다.
// 웹 업로드 API와 폴더 일괄 가져오기 스크립트가 똑같은 이 함수를 쓴다.
// period를 안 넘기면 파일 안의 "조회년월 : YYYY-MM" 표기에서 자동으로 읽어온다.
export async function ingestDischargeWorkbookBuffer(
  buffer: Buffer,
  period?: string,
): Promise<IngestResult> {
  const workbook = new ExcelJS.Workbook();

  try {
    // exceljs 타입 정의가 최신 @types/node의 제네릭 Buffer와 어긋나 있어 캐스팅이 필요하다.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any);
  } catch {
    return { ok: false, message: "엑셀 파일을 읽을 수 없습니다. 파일 형식을 확인해 주세요." };
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { ok: false, message: "엑셀 파일에 시트가 없습니다." };
  }

  const resolvedPeriod = period ?? extractPeriodFromSheet(sheet);
  if (!resolvedPeriod) {
    return {
      ok: false,
      message: '엑셀 파일에서 기준 연월을 찾을 수 없습니다. 파일 안에 "조회년월 : 2026-07" 같은 표기가 있는지 확인해 주세요.',
    };
  }

  // 개인정보로 보이는 컬럼이 있어도 업로드를 막지는 않는다 — 아래 파싱 로직이 정해진
  // 컬럼명만 골라 읽기 때문에 그 값은 어차피 읽거나 저장하지 않는다. 다만 어떤 컬럼을
  // 무시했는지는 참고용으로 남긴다. (특정 시트만 믿지 않고 파일 안 모든 시트를 본다)
  const allHeaders = workbook.worksheets.flatMap((ws) => {
    const headerInfo = findHeaderRow(ws);
    return headerInfo ? headerInfo.headers : getHeaderTexts(ws.getRow(1));
  });
  const ignoredPiiColumns = Array.from(new Set(findPiiColumns(allHeaders)));

  const headerInfo = findHeaderRow(sheet);
  const headers = headerInfo ? headerInfo.headers : getHeaderTexts(sheet.getRow(1));
  const missingColumns = findMissingRequiredColumns(headers);
  if (missingColumns.length > 0) {
    return {
      ok: false,
      message: `필요한 항목(${missingColumns.join(", ")})이 없습니다. 정해진 양식에 맞는 엑셀인지 확인해 주세요.`,
    };
  }

  const parsed = parseDischargeSheet(sheet);

  let saved = true;
  let saveError: string | undefined;
  try {
    await saveDischargeStats(resolvedPeriod, parsed);
  } catch (error) {
    saved = false;
    saveError = error instanceof Error ? error.message : "알 수 없는 오류로 저장하지 못했습니다.";
  }

  return {
    ok: true,
    period: resolvedPeriod,
    sheetName: sheet.name,
    parsed,
    saved,
    saveError,
    ignoredPiiColumns,
  };
}
