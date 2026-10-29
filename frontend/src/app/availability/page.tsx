import { Suspense } from "react";
import AvailabilityClient from "./availability-client";

function AvailabilityFallback() {
  return (
    <div className="py-8 sm:py-12" aria-busy="true">
      <div className="h-8 w-64 animate-pulse rounded bg-surface-2" />
      <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-surface-2" />
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-2" />
        ))}
      </div>
    </div>
  );
}

export default function AvailabilityPage() {
  return (
    <Suspense fallback={<AvailabilityFallback />}>
      <AvailabilityClient />
    </Suspense>
  );
}
