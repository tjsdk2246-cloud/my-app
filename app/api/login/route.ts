import { NextResponse } from "next/server";
import { SESSION_COOKIE, createSessionToken } from "@/lib/auth";
import {
  isLocked,
  registerFailure,
  registerSuccess,
  remainingLockSeconds,
} from "@/lib/login-rate-limit";

export async function POST(request: Request) {
  if (isLocked()) {
    return NextResponse.json(
      {
        ok: false,
        message: `비밀번호를 너무 많이 틀렸습니다. ${remainingLockSeconds()}초 후 다시 시도해 주세요.`,
      },
      { status: 429 },
    );
  }

  const { password } = await request.json();
  const correctPassword = process.env.APP_PASSWORD ?? "";

  if (!correctPassword || password !== correctPassword) {
    registerFailure();
    return NextResponse.json(
      { ok: false, message: "비밀번호가 올바르지 않습니다." },
      { status: 401 },
    );
  }

  const sessionToken = await createSessionToken();
  if (!sessionToken) {
    return NextResponse.json(
      { ok: false, message: "서버에 비밀번호가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  registerSuccess();

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8시간 (토큰 안의 만료 시각도 서버가 별도로 검증한다)
  });
  return response;
}
