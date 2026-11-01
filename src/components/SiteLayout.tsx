import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Crown } from "lucide-react";

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-sidebar-border bg-navy/95 text-sidebar-foreground backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <Crown className="h-7 w-7 text-gold" />
            <span className="font-display text-xl">הנה זה משיח בא</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm font-semibold sm:gap-3">
            <Link to="/how" className="rounded-md px-2 py-1 hover:text-gold">איך זה עובד?</Link>
            <Link to="/order" className="rounded-full bg-gold px-4 py-2 text-accent-foreground shadow-gold hover:brightness-105">
              הגשת בקשה
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="bg-navy py-8 text-center text-sm text-sidebar-foreground/80">
        <p className="font-display text-lg text-gold">״הנה זה משיח בא – מגיע עד אליך לבית״</p>
        <p className="mt-2">מבצע הפצת דגלים ושלטים · פרטי המזמינים משמשים לטיפול בבקשה בלבד</p>
        <Link to="/admin" className="mt-3 inline-block text-xs opacity-60 hover:opacity-100">כניסת צוות</Link>
      </footer>
    </div>
  );
}
