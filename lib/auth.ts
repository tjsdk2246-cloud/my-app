// proxy.ts, 로그인·로그아웃 API가 함께 쓰는 인증 관련 공통 값/함수.
//
// 세션 쿠키는 비밀번호에서 만들지 않는다. 로그인마다 무작위 값을 뽑고
// 만료 시각과 함께 서버만 아는 SESSION_SECRET으로 서명해서 담아둔다.
// 이렇게 하면 쿠키 값이 유출돼도 원래 비밀번호를 알아낼 수 없고,
// 서버가 만료 시각을 직접 검증하므로 오래된 쿠키를 재사용해도 통과되지 않는다.

export const SESSION_COOKIE = "session_auth";

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8시간

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string) {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(hex)) {
    return new Uint8Array(0);
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function getHmacKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    return null;
  }
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

// 로그인 성공 시 발급하는 세션 토큰을 만든다. 실패(SESSION_SECRET 미설정)하면 null.
export async function createSessionToken(): Promise<string | null> {
  const key = await getHmacKey();
  if (!key) return null;

  const sessionId = crypto.randomUUID();
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const payload = `${sessionId}.${expiresAt}`;
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${payload}.${toHex(signature)}`;
}

// 세션 토큰이 우리가 발급한 것이 맞는지(서명 검증) + 아직 만료되지 않았는지 확인한다.
export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [sessionId, expiresAtRaw, signatureHex] = parts;
  const expiresAt = Number(expiresAtRaw);
  if (!sessionId || !Number.isFinite(expiresAt)) return false;
  if (Date.now() > expiresAt) return false;

  const key = await getHmacKey();
  if (!key) return false;

  const payload = `${sessionId}.${expiresAtRaw}`;
  try {
    return await crypto.subtle.verify(
      "HMAC",
      key,
      fromHex(signatureHex),
      new TextEncoder().encode(payload),
    );
  } catch {
    return false;
  }
}
