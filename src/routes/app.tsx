import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth-context";

import {
  LayoutDashboard, Users, ShieldCheck, MailPlus, UsersRound,
  Search, Settings, LogOut, Loader2, Plus, User, CircleUser, Menu,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DashboardProvider, useDashboard } from "@/lib/dashboard-context";
import { InviteEmployeeModal } from "@/components/app/InviteEmployeeModal";
import { NotificationsPopover } from "@/components/app/NotificationsPopover";
import { AccessProvider, useAccess } from "@/lib/access-context";
import { OrgOnboarding } from "@/components/app/access/OrgOnboarding";
import {
  InvitationPendingScreen, OrgSuspendedScreen, MembershipSuspendedScreen,
  SessionExpiredScreen, VerificationPendingBanner, AccessDeniedScreen,
  WorkspaceLoadingScreen, WorkspaceErrorScreen,
} from "@/components/app/access/StateScreens";
import { DevPreview } from "@/components/app/access/DevPreview";
import { Badge } from "@/components/ui/badge";

import { HelpWidget } from "@/components/app/HelpWidget";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { PermissionAction } from "@/lib/access-context";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Kairo Trust Workspace" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AccessProvider>
      <DashboardProvider>
        <AppRoot />
      </DashboardProvider>
    </AccessProvider>
  ),
});

function AppRoot() {
  const { state, loading, error, retry } = useAccess();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const needsSetup = state === "no_org" || state === "setup_incomplete";

  useEffect(() => {
    if (needsSetup && path !== "/app/setup") {
      navigate({ to: "/app/setup", replace: true });
    }
  }, [needsSetup, path, navigate]);

  if (loading) return (<><WorkspaceLoadingScreen /><DevPreview /></>);
  if (state === "session_expired") return (<><SessionExpiredScreen /><DevPreview /></>);
  if (error && state !== "access_denied") {
    return (
      <>
        <WorkspaceErrorScreen
          message={error.message}
          onRetry={() => {
            void retry();
          }}
        />
        <DevPreview />
      </>
    );
  }
  if (state === "access_denied") return (<><AccessDeniedScreen message="You don't have access to this workspace." /><DevPreview /></>);
  if (needsSetup) return (<><OrgOnboarding /><DevPreview /></>);
  if (state === "invitation_pending") return (<><InvitationPendingScreen /><DevPreview /></>);
  if (state === "org_suspended") return (<><OrgSuspendedScreen /><DevPreview /></>);
  if (state === "membership_suspended") return (<><MembershipSuspendedScreen /><DevPreview /></>);
  return (<><AppLayout /><DevPreview /></>);
}

const nav = [
  { to: "/app", label: "Overview", icon: LayoutDashboard, exact: true, key: "o" },
  { to: "/app/people", label: "People", icon: Users, key: "p" },
  { to: "/app/invitations", label: "Trust Invitations", icon: MailPlus, key: "i" },
  { to: "/app/verifications", label: "Employment Verifications", icon: ShieldCheck, key: "v" },
  { to: "/app/team", label: "Team", icon: UsersRound, key: "t" },
  { to: "/app/settings", label: "Settings", icon: Settings, key: "s" },
];

const routePermissionRules: Array<{
  prefix: string;
  action: PermissionAction;
  message: string;
}> = [
  { prefix: "/app/people", action: "modify_person", message: "You don't have permission to view People in this workspace." },
  { prefix: "/app/invitations", action: "modify_invitation", message: "You don't have permission to view Trust Invitations in this workspace." },
  { prefix: "/app/verifications", action: "modify_verification", message: "You don't have permission to view Employment Verifications in this workspace." },
  { prefix: "/app/team", action: "manage_team", message: "You don't have permission to view Team in this workspace." },
  { prefix: "/app/settings", action: "save_settings", message: "You don't have permission to view Settings in this workspace." },
];

function getRoutePermission(path: string) {
  return routePermissionRules.find((rule) => path === rule.prefix || path.startsWith(`${rule.prefix}/`)) ?? null;
}

function NavList({ path, onClick }: { path: string; onClick?: () => void }) {
  return (
    <nav className="p-3 space-y-0.5 flex-1">
      {nav.map((n) => {
        const active = n.exact ? path === n.to : path.startsWith(n.to);
        return (
          <Link key={n.to} to={n.to} onClick={onClick}
            className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
              active ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]")}>
            <n.icon className="h-4 w-4" /> {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

function AppLayout() {
  const { user, session, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { search, setSearch, setInviteOpen } = useDashboard();
  const { role, org, can, state: accessState } = useAccess();
  const searchRef = useRef<HTMLInputElement>(null);
  const gPressed = useRef(false);
  const routePermission = getRoutePermission(path);
  const permissionDenied = routePermission ? !can(routePermission.action) : false;

  useEffect(() => {
    if (loading) return;
    if (!session) { navigate({ to: "/login" }); return; }
    // NOTE: /onboarding is the candidate Trust Passport flow. The Trust
    // Workspace uses /app/setup for organization onboarding, which AppRoot
    // gates via access state. Do NOT redirect workspace users to /onboarding.
  }, [session, loading, navigate]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if (inField) return;
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); return; }
      if (e.key.toLowerCase() === "n") { e.preventDefault(); setInviteOpen(true); return; }
      if (e.key.toLowerCase() === "g") { gPressed.current = true; setTimeout(() => (gPressed.current = false), 800); return; }
      if (gPressed.current) {
        const target = nav.find((n) => n.key === e.key.toLowerCase());
        if (target) { navigate({ to: target.to }); gPressed.current = false; }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, setInviteOpen]);

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  const fullName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "Workspace User";
  const initials = fullName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen flex bg-[hsl(var(--background))]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border/60 bg-background sticky top-0 h-screen">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-border/60">
          <Logo className="h-5" />
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium border-l border-border/60 pl-2 ml-1">Trust Workspace</span>
        </div>
        <NavList path={path} />
        <div className="p-3 border-t border-border/60">
          <Link to="/app/profile" className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-foreground/[0.04]">
            <Avatar className="h-8 w-8"><AvatarFallback className="bg-foreground text-background text-xs">{initials}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold truncate">{fullName}</div>
              <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5">
                {role}
                {org && <span className="opacity-60">· {org.name}</span>}
              </div>
            </div>
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border/60 bg-background/95 backdrop-blur flex items-center px-3 md:px-6 sticky top-0 z-30 gap-2 md:gap-3">
          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden rounded-xl"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <div className="h-16 flex items-center gap-2 px-5 border-b border-border/60">
                <Logo className="h-5" />
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium border-l border-border/60 pl-2 ml-1">Trust Workspace</span>
              </div>
              <NavList path={path} />
            </SheetContent>
          </Sheet>

          <div className="relative flex-1 max-w-xl">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people, invitations, employment verifications…"
              className="pl-9 pr-14 h-10 rounded-xl bg-foreground/[0.03] border-transparent focus-visible:bg-background"
            />
            <kbd className="hidden sm:inline-flex absolute right-3 top-1/2 -translate-y-1/2 h-5 items-center px-1.5 rounded-md border border-border/60 bg-background text-[10px] text-muted-foreground font-mono">/</kbd>
          </div>

          {can("invite_candidate") ? (
            <Button onClick={() => setInviteOpen(true)} className="btn-premium rounded-xl hidden sm:inline-flex" size="sm">
              <Plus className="h-4 w-4 mr-1.5" /> Invite candidate
            </Button>
          ) : (
            <Badge variant="outline" className="hidden sm:inline-flex h-8 items-center text-[11px] font-medium">
              {role} · read-only
            </Badge>
          )}

          <NotificationsPopover />



          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full outline-none focus-visible:ring-2 ring-foreground/20">
                <Avatar className="h-8 w-8"><AvatarFallback className="bg-foreground text-background text-xs">{initials}</AvatarFallback></Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuLabel>
                <div className="text-sm font-semibold">{fullName}</div>
                <div className="text-[11px] text-muted-foreground font-normal">{user?.email ?? "No email available"}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link to="/app/profile"><User className="h-4 w-4 mr-2" /> My profile</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/app/profile"><CircleUser className="h-4 w-4 mr-2" /> My account</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/app/settings"><Settings className="h-4 w-4 mr-2" /> Settings</Link></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut().then(() => navigate({ to: "/login" }))}>
                <LogOut className="h-4 w-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {accessState === "verification_pending" && <VerificationPendingBanner />}
        <div className="border-b border-border/60 bg-foreground/[0.03] px-4 md:px-8 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
          Demo environment · Sample data
        </div>
        <main className="flex-1 p-4 md:p-8 max-w-[1500px] w-full mx-auto">
          {accessState === "access_denied" ? (
            <AccessDeniedScreen message="You don't have access to this workspace." />
          ) : permissionDenied ? (
            <AccessDeniedScreen message={routePermission?.message} />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={path} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                <Outlet />
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      <InviteEmployeeModal />
      
      <HelpWidget />
    </div>
  );
}
