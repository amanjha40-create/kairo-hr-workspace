import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/app/primitives";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/app/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user } = useAuth();
  const name = (user?.user_metadata?.full_name as string | undefined) ?? "";
  const initials = (name || user?.email || "U").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div>
      <PageHeader eyebrow="Account" title="My profile" description="Manage your personal information and preferences." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Personal information">
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-foreground text-background flex items-center justify-center text-lg font-semibold">{initials}</div>
                <Button variant="outline" size="sm" className="rounded-lg">Upload photo</Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name"><Input defaultValue={name} className="rounded-xl" /></Field>
                <Field label="Email"><Input defaultValue={user?.email ?? ""} className="rounded-xl" /></Field>
                <Field label="Phone"><Input placeholder="+91 98XXXXXXXX" className="rounded-xl" /></Field>
                <Field label="Role"><Input defaultValue="HR Admin" className="rounded-xl" /></Field>
                <Field label="Organization"><Input defaultValue="Acme Inc." className="rounded-xl" /></Field>
              </div>
              <div className="flex justify-end"><Button className="btn-premium rounded-xl" onClick={() => toast.success("Profile updated")}>Save changes</Button></div>
            </div>
          </SectionCard>

          <SectionCard title="Security">
            <div className="p-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Current password"><Input type="password" className="rounded-xl" /></Field>
                <Field label="New password"><Input type="password" className="rounded-xl" /></Field>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <div><div className="text-sm font-medium">Two-factor authentication</div><div className="text-[11px] text-muted-foreground">Adds an extra layer of security to sign-in</div></div>
                <Switch defaultChecked />
              </div>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Notifications">
          <div className="p-6 space-y-3">
            {["Verification updates", "Weekly reports", "Product announcements", "Billing"].map((l) => (
              <div key={l} className="flex items-center justify-between"><div className="text-sm">{l}</div><Switch defaultChecked /></div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs text-muted-foreground mb-1.5 block">{label}</Label>{children}</div>;
}
