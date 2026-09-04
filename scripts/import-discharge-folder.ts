// 폴더에 담긴 퇴원 엑셀 파일들을 한 번에 읽어서 Supabase에 저장하는 로컬 전용 스크립트.
// 웹 화면 업로드와 똑같은 검증(개인정보·필수 컬럼)과 계산 로직을 그대로 재사용한다.
//
// ⚠️ 이 스크립트는 이 컴퓨터에서만 동작한다. Vercel에 배포한 뒤에는 서버가
// 이 컴퓨터의 폴더에 접근할 수 없으므로, 매달 새 데이터는 웹 화면 업로드를 쓴다.
//
// 사용법:
//   npm run import:discharge                — my-app/import-data 폴더를 읽는다
//   npm run import:discharge -- <폴더 경로>   — 다른 폴더를 지정한다
//
// 파일명 규칙: 파일명이 "2024-09"로 시작해야 그 부분을 기준 연월로 인식한다.
// "2024-09.xlsx", "2024-09_퇴원예고통계.xlsx" 둘 다 된다.

import { config as loadEnv } from "dotenv";
import path from "node:path";
import fs from "node:fs";
import { ingestDischargeWorkbookBuffer } from "../lib/discharge-ingest";

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });
loadEnv({ path: path.resolve(process.cwd(), ".env") });

// 파일명이 "2024-09.xlsx"처럼 딱 연월이어도, "2024-09_퇴원예고통계.xlsx"처럼 뒤에
// 설명이 더 붙어 있어도 맨 앞의 연월만 보고 인식한다.
const PERIOD_FILENAME_PATTERN = /^(\d{4}-(?:0[1-9]|1[0-2]))/;

async function main() {
  const folder = process.argv[2] ?? path.resolve(process.cwd(), "import-data");

  if (!fs.existsSync(folder)) {
    console.error(`폴더를 찾을 수 없습니다: ${folder}`);
    console.error(`my-app 폴더 안에 "import-data" 폴더를 만들고 그 안에 엑셀 파일을 넣어주세요.`);
    process.exitCode = 1;
    return;
  }

  const files = fs
    .readdirSync(folder)
    .filter((name) => name.toLowerCase().endsWith(".xlsx"))
    .sort();

  if (files.length === 0) {
    console.log(`${folder} 안에 .xlsx 파일이 없습니다.`);
    return;
  }

  console.log(`${files.length}개 파일을 찾았습니다. (${folder})\n`);

  let successCount = 0;
  let failCount = 0;

  for (const fileName of files) {
    const match = fileName.match(PERIOD_FILENAME_PATTERN);
    if (!match) {
      console.log(`⏭️  건너뜀: ${fileName} (파일명이 "2024-09"처럼 연월로 시작하지 않습니다)`);
      failCount += 1;
      continue;
    }

    const period = match[1];
    const buffer = fs.readFileSync(path.join(folder, fileName));

    try {
      const result = await ingestDischargeWorkbookBuffer(buffer, period);

      if (!result.ok) {
        console.log(`❌ ${fileName} (${period}): ${result.message}`);
        failCount += 1;
        continue;
      }

      if (!result.saved) {
        console.log(`⚠️  ${fileName} (${period}): 계산은 됐지만 저장에 실패했습니다 — ${result.saveError}`);
        failCount += 1;
        continue;
      }

      console.log(
        `✅ ${fileName} (${period}): 저장 완료 — 진료과 ${result.parsed.departmentStats.length}개, ` +
          `의사 ${result.parsed.doctorStats.length}명, 총 ${result.parsed.totalRows}행`,
      );
      if (result.ignoredPiiColumns.length > 0) {
        console.log(`   (개인정보로 보이는 항목(${result.ignoredPiiColumns.join(", ")})은 읽지 않고 무시함)`);
      }
      successCount += 1;
    } catch (error) {
      console.log(`❌ ${fileName} (${period}): ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
      failCount += 1;
    }
  }

  console.log(`\n완료: 성공 ${successCount}개 / 실패(또는 건너뜀) ${failCount}개 / 전체 ${files.length}개`);
  if (failCount > 0) process.exitCode = 1;
}

main();
