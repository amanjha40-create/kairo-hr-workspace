import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { getMarketingWebsiteUrl } from "@/lib/app-config";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your Kairo account — Hiring team signup" },
      { name: "description", content: "Get your hiring team on Kairo. Reusable, source-verified trust infrastructure for modern recruiters." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const marketingWebsiteUrl = getMarketingWebsiteUrl();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    work_email: "",
    company_name: "",
    company_size: "",
    hiring_volume: "",
    password: "",
  });

  const onChange = (k: keyof typeof form) => (v: string) => setForm((s) => ({ ...s, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    const { error, data } = await supabase.auth.signUp({
      email: form.work_email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
        data: {
          full_name: form.full_name,
          company_name: form.company_name,
          company_size: form.company_size,
          hiring_volume: form.hiring_volume,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      navigate({ to: "/onboarding" });
    } else {
      toast.success("Check your work email to verify your account.");
      navigate({ to: "/login", search: { verify: "1" } as never });
    }
  }

  async function handleGoogle() {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/onboarding` });
    if (res.error) toast.error("Could not start Google sign-in");
  }

  return (
    <AuthShell
      title="Create your hiring team account"
      subtitle="Built for recruiters, HR, and talent teams. Not for candidates."
      footer={<>Already have an account? <Link to="/login" className="text-foreground font-medium hover:underline">Sign in</Link></>}
    >
      <div className="space-y-3">
        <Button type="button" variant="outline" className="w-full h-11 rounded-xl" onClick={handleGoogle}>
          <GoogleIcon /> Continue with Google
        </Button>
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/70" /></div>
          <div className="relative flex justify-center text-xs uppercase tracking-wider">
            <span className="bg-background px-2 text-muted-foreground">or use work email</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <Field label="Full name">
          <Input required value={form.full_name} onChange={(e) => onChange("full_name")(e.target.value)} placeholder="Jane Doe" className="h-11 rounded-xl" />
        </Field>
        <Field label="Work email">
          <Input required type="email" value={form.work_email} onChange={(e) => onChange("work_email")(e.target.value)} placeholder="jane@company.com" className="h-11 rounded-xl" />
        </Field>
        <Field label="Company name">
          <Input required value={form.company_name} onChange={(e) => onChange("company_name")(e.target.value)} placeholder="Acme Inc." className="h-11 rounded-xl" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Company size">
            <Select value={form.company_size} onValueChange={onChange("company_size")}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {["1-10","11-50","51-200","201-1000","1000+"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Hiring volume / mo">
            <Select value={form.hiring_volume} onValueChange={onChange("hiring_volume")}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {["<10","10-50","50-200","200-1000","1000+"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Password" hint="8+ characters">
          <Input required type="password" value={form.password} onChange={(e) => onChange("password")(e.target.value)} placeholder="••••••••" className="h-11 rounded-xl" />
        </Field>
        <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl btn-premium">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
        </Button>
        <p className="text-[11px] text-muted-foreground text-center leading-relaxed pt-1">
          By signing up you agree to our <a href={`${marketingWebsiteUrl}/terms`} className="underline">Terms</a> and <a href={`${marketingWebsiteUrl}/privacy`} className="underline">Privacy Policy</a>.
        </p>
      </form>
    </AuthShell>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-foreground/80">{label}</Label>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4-5.5 4-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.6 14.6 2.7 12 2.7 6.9 2.7 2.7 6.9 2.7 12s4.2 9.3 9.3 9.3c5.4 0 8.9-3.8 8.9-9.1 0-.6-.1-1.1-.2-1.7H12z"/></svg>
  );
}
