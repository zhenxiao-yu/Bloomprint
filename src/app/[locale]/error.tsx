"use client";

import { Link } from "@/i18n/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-4 py-12">
      <Alert>
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>
          Bloomprint hit an unexpected issue. Your saved plans live on this device, and you can try
          again without losing the whole app.
        </AlertDescription>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={reset}>Try again</Button>
          <Link href="/plan" className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium">
            Start a fresh plan
          </Link>
        </div>
      </Alert>
    </main>
  );
}
