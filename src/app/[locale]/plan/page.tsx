import { Suspense } from "react";
import { PlanExperience } from "@/components/PlanExperience";

export default function PlanPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-10 text-muted">Loading…</div>}>
      <PlanExperience />
    </Suspense>
  );
}
