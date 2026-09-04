// 비밀번호를 5번 연속 틀리면 5분간 로그인을 잠근다.
// 서버 프로세스 하나에 메모리로만 저장하므로, 나중에 Vercel 같은
// 서버리스 환경에 여러 인스턴스로 배포하면 별도 저장소로 옮겨야 한다.

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 5 * 60 * 1000;

let failedAttempts = 0;
let lockedUntil = 0;

export function isLocked() {
  return Date.now() < lockedUntil;
}

export function remainingLockSeconds() {
  return Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
}

export function registerFailure() {
  failedAttempts += 1;
  if (failedAttempts >= MAX_ATTEMPTS) {
    lockedUntil = Date.now() + LOCK_DURATION_MS;
    failedAttempts = 0;
  }
}

export function registerSuccess() {
  failedAttempts = 0;
  lockedUntil = 0;
}
