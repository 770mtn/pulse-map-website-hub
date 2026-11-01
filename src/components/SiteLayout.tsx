import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Crown } from "lucide-react";
import { useSiteContent } from "@/lib/site-content";

export function SiteLayout({ children }: { children: ReactNode }) {
  const t = useSiteContent();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-sidebar-border bg-navy/95 text-sidebar-foreground backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <Crown className="h-7 w-7 text-gold" />
            <span className="font-display text-xl">{t.site_name}</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm font-semibold sm:gap-3">
            <Link to="/admin" className="rounded-md px-2 py-1 text-xs opacity-70 hover:text-gold hover:opacity-100">ניהול</Link>
            <Link to="/how" className="rounded-md px-2 py-1 hover:text-gold">{t.nav_how}</Link>
            <Link to="/order" className="rounded-full bg-gold px-4 py-2 text-accent-foreground shadow-gold hover:brightness-105">
              {t.nav_order}
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="bg-navy py-8 text-center text-sm text-sidebar-foreground/80">
        <p className="font-display text-lg text-gold">{t.footer_slogan}</p>
        <p className="mt-2">{t.footer_note}</p>
        <Link to="/admin" className="mt-3 inline-block text-xs opacity-60 hover:opacity-100">כניסת צוות</Link>
      </footer>
    </div>
  );
}
