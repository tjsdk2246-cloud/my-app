import Link from "next/link";
import ReportPanel from "@/app/_panels/ReportPanel";

export default function ReportPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-4 p-8">
        <Link href="/" className="text-sm text-zinc-500 hover:underline dark:text-zinc-400">
          ← 홈으로
        </Link>
        <ReportPanel />
      </div>
    </div>
  );
}
