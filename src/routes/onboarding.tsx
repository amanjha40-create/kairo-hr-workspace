import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ArrowRight, ShieldCheck, Workflow, Layers, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ProfileTypeStep, type ProfileType } from "@/components/onboarding/ProfileTypeStep";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Welcome to Kairo — Onboarding" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OnboardingPage,
});

const steps = [
  {
    icon: ShieldCheck,
    eyebrow: "The problem",
    title: "Hiring trust is broken.",
    body: "Manual verification workflows slow down hiring and create friction across teams.",
    visual: <FragmentedVisual />,
  },
  {
    icon: Sparkles,
    eyebrow: "The shift",
    title: "Verify candidates faster with reusable trust.",
    body: "Kairo gives hiring teams instant access to source-verified professional records that move with the candidate.",
    visual: <PortableTrustVisual />,
  },
  {
    icon: Workflow,
    eyebrow: "The platform",
    title: "Centralize verification workflows.",
    body: "Manage employment checks, documents, and candidate trust profiles in one place.",
    visual: <DashboardVisual />,
  },
  {
    icon: Layers,
    eyebrow: "You're ready",
    title: "Built for modern hiring teams.",
    body: "Reduce verification delays, improve candidate experience, and accelerate onboarding.",
    visual: <ReadyVisual />,
  },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [i, setI] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [profileType, setProfileType] = useState<ProfileType | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  // Step 0 = ProfileTypeStep (full width); steps 1..N = existing storytelling steps
  const totalSteps = steps.length + 1;
  const isProfileStep = i === 0;
  const storyIndex = i - 1;
  const step = steps[storyIndex];
  const isLast = i === totalSteps - 1;
  const canContinue = isProfileStep ? !!profileType : true;

  async function finish() {
    if (!user) return;
    setFinishing(true);
    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id);
    setFinishing(false);
    if (error) {
      toast.error("Could not complete onboarding");
      return;
    }
    navigate({ to: "/app" });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-16 flex items-center justify-between px-6 border-b border-border/50">
        <Logo className="h-5" />
        <button onClick={finish} className="text-xs text-muted-foreground hover:text-foreground">Skip</button>
      </header>

      {/* progress */}
      <div className="px-6 pt-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-1.5" aria-label="Progress">
          {Array.from({ length: totalSteps }).map((_, idx) => (
            <div key={idx} className={`h-1 flex-1 rounded-full transition-all duration-300 ${idx <= i ? "bg-foreground" : "bg-foreground/10"}`} />
          ))}
        </div>
      </div>

      {isProfileStep ? (
        <main className="flex-1 flex items-start justify-center p-6 sm:p-10">
          <div className="w-full">
            <div key="profile" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <ProfileTypeStep value={profileType} onChange={setProfileType} />
              <div className="mt-8 max-w-3xl mx-auto flex items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">Step 1 of {totalSteps}</div>
                <Button
                  onClick={() => setI(1)}
                  disabled={!canContinue}
                  className="btn-premium rounded-xl h-11 px-5"
                >
                  Continue <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <div className="flex-1 grid lg:grid-cols-2">
          <main className="flex items-center p-6 sm:p-12">
            <div className="w-full max-w-lg mx-auto">
              <div key={i} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-4">
                  <step.icon className="h-3.5 w-3.5" /> {step.eyebrow}
                </div>
                <h1 className="text-[34px] sm:text-[42px] font-semibold tracking-tight leading-[1.05] text-foreground">
                  {step.title}
                </h1>
                <p className="mt-4 text-base text-muted-foreground max-w-md leading-relaxed">{step.body}</p>

                <div className="mt-10 flex items-center gap-3">
                  <Button variant="ghost" onClick={() => setI(i - 1)} className="rounded-xl">Back</Button>
                  {isLast ? (
                    <Button onClick={finish} disabled={finishing} className="btn-premium rounded-xl h-11 px-5">
                      {finishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Enter dashboard <ArrowRight className="ml-1.5 h-4 w-4" /></>}
                    </Button>
                  ) : (
                    <Button onClick={() => setI(i + 1)} className="btn-premium rounded-xl h-11 px-5">
                      Continue <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="mt-6 text-xs text-muted-foreground">Step {i + 1} of {totalSteps}</div>
              </div>
            </div>
          </main>

          <aside className="hidden lg:flex items-center justify-center bg-gradient-to-br from-[hsl(var(--primary)/0.06)] via-background to-background border-l border-border/50 p-12">
            <div key={`v-${i}`} className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
              {step.visual}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

/* ------- Visuals (lightweight SVG/CSS) ------- */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border/70 bg-background/80 backdrop-blur p-4 shadow-sm ${className}`}>{children}</div>;
}

function FragmentedVisual() {
  return (
    <div className="space-y-3">
      {["Email PDFs", "Spreadsheets", "Manual calls", "Vendor portals"].map((label, idx) => (
        <Card key={label} className={`flex items-center gap-3 ${idx % 2 ? "ml-6" : ""}`}>
          <div className="h-2 w-2 rounded-full bg-destructive/70" />
          <div className="text-sm font-medium">{label}</div>
          <div className="ml-auto text-xs text-muted-foreground">Disconnected</div>
        </Card>
      ))}
    </div>
  );
}

function PortableTrustVisual() {
  return (
    <Card className="p-6">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">Verified profile</div>
      <div className="mt-2 text-lg font-semibold">Priya R. · Senior Engineer</div>
      <div className="mt-4 space-y-2">
        {["Employment · Verified at source", "Education · Verified at source", "Identity · KYC complete"].map((l) => (
          <div key={l} className="flex items-center justify-between text-sm">
            <span>{l}</span>
            <span className="text-emerald-600 text-xs font-medium">✓ Verified</span>
          </div>
        ))}
      </div>
      <div className="mt-5 flex gap-2 text-[11px] text-muted-foreground">
        <span className="px-2 py-1 rounded-full bg-foreground/[0.04]">Portable</span>
        <span className="px-2 py-1 rounded-full bg-foreground/[0.04]">Reusable</span>
        <span className="px-2 py-1 rounded-full bg-foreground/[0.04]">Source-signed</span>
      </div>
    </Card>
  );
}

function DashboardVisual() {
  return (
    <Card className="p-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { l: "Pending", v: "12" },
          { l: "Verified", v: "284" },
          { l: "Avg TAT", v: "2.1m" },
        ].map((s) => (
          <div key={s.l} className="rounded-xl bg-foreground/[0.03] p-3">
            <div className="text-[10px] uppercase text-muted-foreground">{s.l}</div>
            <div className="text-lg font-semibold mt-0.5">{s.v}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {[80, 56, 42, 30].map((w, i) => (
          <div key={i} className="h-2 rounded-full bg-foreground/[0.05] overflow-hidden">
            <div className="h-full bg-foreground/70" style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function ReadyVisual() {
  return (
    <Card className="p-8 text-center">
      <div className="h-14 w-14 rounded-2xl bg-foreground text-background flex items-center justify-center mx-auto">
        <Sparkles className="h-7 w-7" />
      </div>
      <div className="mt-5 text-xl font-semibold tracking-tight">Your workspace is ready</div>
      <div className="mt-1 text-sm text-muted-foreground">Modern hiring infrastructure.</div>
    </Card>
  );
}
