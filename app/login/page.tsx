import { Suspense } from "react";

import { LoginPanel } from "@/components/auth/login-panel";

export default function LoginPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-14">
      <Suspense fallback={<p className="text-sm text-neutral-400">Booting...</p>}>
        <LoginPanel />
      </Suspense>
    </div>
  );
}
