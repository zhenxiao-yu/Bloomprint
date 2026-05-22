"use client";

import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function PlanError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-4 py-12">
      <Alert>
        <AlertTitle>We could not show that plan</AlertTitle>
        <AlertDescription>
          The deterministic planner is still available. Try again, or start a fresh plan if this
          shared link looks damaged.
        </AlertDescription>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={reset}>Try again</Button>
          <Link href="/plan" className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium">
            New plan
          </Link>
        </div>
      </Alert>
    </main>
  );
}
