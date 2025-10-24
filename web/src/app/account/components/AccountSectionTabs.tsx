"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const tabs = [
  { href: "/account", label: "Profile" },
  { href: "/account/analytics", label: "Analytics" },
  { href: "/account/customization", label: "Customization" },
];

export default function AccountSectionTabs() {
  const pathname = usePathname() || "";

  return (
    <nav
      aria-label="Account sections"
      className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 p-1 text-sm shadow-sm backdrop-blur"
    >
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/account"
            ? pathname === tab.href
            : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-full px-4 py-2 transition-colors",
              isActive
                ? "bg-primary/90 text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
