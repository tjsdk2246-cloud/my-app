"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.message ?? "비밀번호가 올바르지 않습니다.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
      <form
        onSubmit={handleSubmit}
        className="flex w-80 flex-col gap-3 rounded-xl border border-black/[.08] bg-white p-8 dark:border-white/[.145] dark:bg-zinc-900"
      >
        <h1 className="text-center text-lg font-semibold text-black dark:text-zinc-50">
          퇴원예고·병상회전율 관리 챗봇
        </h1>
        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          공용 비밀번호를 입력하세요.
        </p>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="비밀번호"
          autoFocus
          className="rounded-md border border-black/[.08] px-3 py-2 text-black outline-none focus:border-zinc-500 dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-foreground px-5 py-2 text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
        >
          {loading ? "확인 중..." : "확인"}
        </button>
      </form>
    </div>
  );
}
