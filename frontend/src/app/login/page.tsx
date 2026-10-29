import { Suspense } from "react";
import LoginClient from "./login-client";

function LoginFallback() {
  return (
    <div className="mx-auto max-w-md py-8 sm:py-16" aria-busy="true">
      <div className="h-8 w-48 animate-pulse rounded bg-surface-2" />
      <div className="mt-3 h-4 w-64 max-w-full animate-pulse rounded bg-surface-2" />
      <div className="mt-6 space-y-4">
        <div className="h-11 animate-pulse rounded-xl bg-surface-2" />
        <div className="h-11 animate-pulse rounded-xl bg-surface-2" />
        <div className="h-11 animate-pulse rounded-xl bg-surface-2" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginClient />
    </Suspense>
  );
}
