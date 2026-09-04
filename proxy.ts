import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

// 로그인 없이 접근을 허용하는 경로
const PUBLIC_PATHS = ["/login", "/api/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // 비밀번호(또는 세션 서명 키)가 서버에 설정돼 있지 않으면, 그 무엇도
  // "정답"으로 인정하지 않고 무조건 막는다. (설정을 깜빡했을 때 우회되는 것을 방지)
  if (!process.env.APP_PASSWORD || !process.env.SESSION_SECRET) {
    const message = "서버에 비밀번호가 설정되지 않았습니다.";
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ ok: false, message }, { status: 503 });
    }
    return new NextResponse(message, { status: 503 });
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;

  if (await verifySessionToken(sessionCookie)) {
    return NextResponse.next();
  }

  // API 요청은 로그인 화면으로 리다이렉트하면 클라이언트가 그 응답을 200 성공으로
  // 착각할 수 있어, 대신 401을 그대로 돌려준다.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { ok: false, message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
