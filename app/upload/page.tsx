import Link from "next/link";
import UploadPanel from "@/app/_panels/UploadPanel";

export default function UploadPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="flex w-full max-w-md flex-col gap-4 p-8">
        <Link href="/" className="text-sm text-zinc-500 hover:underline dark:text-zinc-400">
          ← 홈으로
        </Link>
        <UploadPanel />
      </div>
    </div>
  );
}
