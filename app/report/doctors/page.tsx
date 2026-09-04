import DoctorsPanel from "@/app/_panels/DoctorsPanel";

export default function DoctorReportPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-4 p-8">
        <DoctorsPanel />
      </div>
    </div>
  );
}
