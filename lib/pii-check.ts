// 엑셀 업로드(웹 화면)와 폴더 일괄 가져오기(로컬 스크립트)가 함께 쓰는
// 개인정보 컬럼 검사 로직. 한 곳에서만 관리해 두 경로가 서로 다르게 동작하지 않게 한다.

// 이 키워드가 컬럼명에 들어있으면 개인식별 정보로 보고 업로드를 막는다.
export const PII_KEYWORDS = [
  "이름",
  "성명",
  "성함",
  "환자명",
  "등록번호",
  "환자등록번호",
  "주민등록번호",
  "주민번호",
  "차트번호",
  "환자번호",
  "환자아이디",
  "생년월일",
  "전화번호",
  "연락처",
  "휴대폰",
  "주소",
  "name",
  "rrn",
  "ssn",
  "mrn",
  "phone",
  "address",
  "patient_id",
  "patientid",
];

export function findPiiColumns(headers: string[]) {
  return headers.filter((header) => {
    const normalized = header.trim().toLowerCase();
    if (!normalized) return false;
    return PII_KEYWORDS.some((keyword) => normalized.includes(keyword.toLowerCase()));
  });
}
