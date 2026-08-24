import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { getMarketingWebsiteUrl } from "@/lib/app-config";
import type { ReactNode } from "react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const marketingWebsiteUrl = getMarketingWebsiteUrl();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-16 flex items-center px-6 border-b border-border/50">
        <Logo className="h-5" />
      </header>
      <div className="flex-1 grid lg:grid-cols-2">
        <main className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-7">
              <h1 className="text-[28px] sm:text-3xl font-semibold tracking-tight text-foreground">
                {title}
              </h1>
              {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            {children}
            {footer && (
              <div className="mt-6 text-sm text-muted-foreground text-center">{footer}</div>
            )}
          </div>
        </main>
        <aside className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-[hsl(var(--primary)/0.06)] via-background to-background border-l border-border/50">
          <div />
          <div className="max-w-md">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Trust infrastructure for modern hiring
            </p>
            <p className="text-2xl font-medium tracking-tight text-foreground leading-snug">
              "Kairo replaced three vendors and cut our time-to-verify from days to minutes."
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-foreground/[0.06]" />
              <div>
                <div className="text-sm font-medium">Head of Talent</div>
                <div className="text-xs text-muted-foreground">Modern hiring team</div>
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-4">
            <a href={`${marketingWebsiteUrl}/privacy`} className="hover:text-foreground">
              Privacy
            </a>
            <a href={`${marketingWebsiteUrl}/terms`} className="hover:text-foreground">
              Terms
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
