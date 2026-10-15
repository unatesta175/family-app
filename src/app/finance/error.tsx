"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/finance/ui/button";

export default function FinanceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[finance] page error:", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <p className="text-base font-bold">Something went wrong loading this page</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        {error.digest ? `Error ${error.digest}` : "Give it another try — it's usually a one-off."}
      </p>
      <Button type="button" onClick={() => reset()} className="mt-2">
        Try again
      </Button>
    </div>
  );
}
