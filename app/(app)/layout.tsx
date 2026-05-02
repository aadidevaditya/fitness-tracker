import type { Metadata } from "next";

import { BottomNav } from "@/components/nav/bottom-nav";

export const metadata: Metadata = {
  title: {
    template: "%s · Lean Gain",
    default: "Lean Gain HQ",
  },
};

export default function AuthenticatedShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="flex min-h-[calc(100vh-132px)] flex-1 flex-col gap-10 pb-8">
        {children}
      </div>
      <BottomNav />
    </>
  );
}
