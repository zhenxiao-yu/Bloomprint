import { Skeleton } from "@/components/ui/skeleton";
import { PlanBuildLoading } from "@/components/PlanBuildLoading";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <PlanBuildLoading compact />
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    </main>
  );
}
