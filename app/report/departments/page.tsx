import DepartmentsPanel from "@/app/_panels/DepartmentsPanel";

export default function DepartmentDetailPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="flex w-full max-w-3xl flex-col gap-4 p-8">
        <DepartmentsPanel />
      </div>
    </div>
  );
}
