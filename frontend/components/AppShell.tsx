"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { clearAuth, getUser } from "@/lib/api";

const mainNav = [
  { href: "/dashboard", label: "Campaigns", icon: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" },
  { href: "/search", label: "Search", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
  { href: "/insights", label: "Insights", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { href: "/templates", label: "Templates", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
];

function Icon({ d }: { d: string }) {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} />
    </svg>
  );
}

export default function AppShell({
  children,
  breadcrumbs,
  title,
  subtitle,
  campaignId,
  campaignTitle,
  campaignTab,
}: {
  children: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  title?: string;
  subtitle?: string;
  campaignId?: number;
  campaignTitle?: string;
  campaignTab?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser();

  if (!user) return <>{children}</>;

  const campaignTabs = campaignId
    ? [
        { key: "creators", label: "Creators", href: `/campaigns/${campaignId}?tab=creators` },
        { key: "outreach", label: "Outreach", href: `/campaigns/${campaignId}?tab=outreach` },
        { key: "team", label: "Team", href: `/campaigns/${campaignId}?tab=team` },
        { key: "performance", label: "Performance", href: `/campaigns/${campaignId}?tab=performance` },
        { key: "summary", label: "Summary", href: `/campaigns/${campaignId}?tab=summary` },
      ]
    : [];

  return (
    <div className="flex min-h-screen bg-surface-muted">
      {/* Sidebar */}
      <aside className="flex w-36 flex-shrink-0 flex-col border-r border-surface-border bg-white px-2 py-4">
        <BrandLogo
          href="/dashboard"
          variant="icon"
          iconClassName="mx-auto mb-6 h-8 w-8"
        />
        <nav className="flex flex-col gap-0.5">
          {mainNav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${
                  active
                    ? "bg-brand-100 text-brand-700"
                    : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
                }`}
              >
                <Icon d={item.icon} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto">
          <button
            onClick={() => {
              clearAuth();
              router.push("/login");
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <Icon d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            <span className="text-sm font-medium">Exit</span>
          </button>
        </div>
      </aside>

      {/* Campaign sidebar */}
      {campaignId && (
        <aside className="hidden w-52 flex-shrink-0 border-r border-surface-border bg-white md:block">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 px-4 py-3 text-xs text-neutral-500 hover:text-brand-600"
          >
            ← All campaigns
          </Link>
          <p className="px-4 pb-3 text-sm font-semibold leading-snug text-neutral-900">{campaignTitle}</p>
          <nav className="px-2">
            {campaignTabs.map((tab) => (
              <Link
                key={tab.key}
                href={tab.href}
                className={`mb-0.5 block rounded-md px-3 py-2 text-sm ${
                  campaignTab === tab.key
                    ? "bg-surface-muted font-medium text-neutral-900"
                    : "text-neutral-600 hover:bg-surface-muted"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </aside>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-surface-border bg-white px-6 py-3">
          <div>
            {breadcrumbs && breadcrumbs.length > 0 && (
              <div className="mb-1 flex items-center gap-1 text-xs text-neutral-500">
                {breadcrumbs.map((b, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span>›</span>}
                    {b.href ? (
                      <Link href={b.href} className="hover:text-brand-600">
                        {b.label}
                      </Link>
                    ) : (
                      <span>{b.label}</span>
                    )}
                  </span>
                ))}
              </div>
            )}
            {title && <h1 className="text-xl font-semibold text-neutral-900">{title}</h1>}
            {subtitle && <p className="text-sm text-neutral-500">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-neutral-500 sm:inline">{user.brand_name}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
              {user.full_name?.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
