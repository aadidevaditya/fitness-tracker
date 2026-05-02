"use client";

import {
  CalendarDays,
  Dumbbell,
  LayoutDashboard,
  LineChart,
  Settings2,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Hub" },
  { href: "/today", icon: CalendarDays, label: "Fuel" },
  { href: "/diet", icon: UtensilsCrossed, label: "Cook" },
  { href: "/workout", icon: Dumbbell, label: "Lift" },
  { href: "/progress", icon: LineChart, label: "Lens" },
  { href: "/settings", icon: Settings2, label: "Dial" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-4 left-1/2 z-40 grid w-[min(720px,calc(100vw-28px))] -translate-x-1/2 grid-cols-6 gap-[2px] rounded-3xl border border-neutral-900 bg-neutral-950/97 p-[6px] shadow-2xl shadow-black/80 backdrop-blur">
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));

        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            className={cn(
              "flex flex-col items-center justify-center gap-[2px] rounded-2xl px-1 py-2 text-[10px] font-semibold uppercase tracking-[0.12em]",
              active
                ? "bg-neutral-50 text-neutral-950"
                : "text-neutral-500 hover:bg-neutral-900 hover:text-neutral-50",
            )}
          >
            <Icon className="size-[18px]" aria-hidden />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
