import { Skeleton } from "@/components/ui/skeleton";

export default function PlansLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="mt-3 h-4 w-72" />
      <div className="mt-6 flex flex-col gap-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    </main>
  );
}
