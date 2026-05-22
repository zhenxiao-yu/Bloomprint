import { Suspense } from "react";
import { PlanExperience } from "@/components/PlanExperience";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlanPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="mt-4 h-28 w-full" />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </main>
      }
    >
      <PlanExperience />
    </Suspense>
  );
}
