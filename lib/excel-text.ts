import type ExcelJS from "exceljs";

// 엑셀 셀 값에는 일반 문자열 외에 서식이 섞인 텍스트(rich text), 하이퍼링크,
// 수식 결과 등 객체 형태가 올 수 있다. 이런 값을 무심코 toString()하면
// "[object Object]"가 되어버리므로, 실제 눈에 보이는 텍스트를 최대한 뽑아낸다.
export function cellToText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }
    if ("text" in value && value.text !== undefined) {
      return String(value.text);
    }
    if ("result" in value && value.result !== undefined) {
      return cellToText(value.result as ExcelJS.CellValue);
    }
  }
  return String(value);
}

export function getHeaderTexts(row: ExcelJS.Row): string[] {
  const headers: string[] = [];
  row.eachCell({ includeEmpty: false }, (cell) => {
    headers.push(cellToText(cell.value));
  });
  return headers;
}
