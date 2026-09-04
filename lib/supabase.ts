import { createClient } from "@supabase/supabase-js";

// 서버 코드(API 라우트)에서만 사용한다. 여기서 쓰는 secret key는 RLS를
// 건너뛰는 강력한 키이므로 브라우저로 절대 내려보내지 않는다.
export function getSupabaseServerClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL 또는 SUPABASE_SECRET_KEY가 설정되지 않았습니다.");
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
