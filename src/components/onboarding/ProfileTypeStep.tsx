import { useState } from "react";
import { Briefcase, Bike, Laptop2, GraduationCap, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProfileType = "employee" | "gig" | "freelancer" | "student";

const profiles = [
  {
    key: "employee" as const,
    title: "Professional Employee",
    icon: Briefcase,
    description: "Full-time or part-time employee at a company.",
    details: [
      "Employment history verification",
      "Designation validation",
      "Tenure confirmation",
      "Employer verification",
      "Experience record building",
      "Professional trust score generation",
    ],
    benefit: "Best for corporate hiring and career growth",
    chips: ["Employment", "Experience", "Identity"],
  },
  {
    key: "gig" as const,
    title: "Gig Worker / Delivery Partner",
    icon: Bike,
    description: "Active on platforms such as Uber, Swiggy, Zomato, Porter, Rapido and similar networks.",
    details: [
      "Platform activity verification",
      "Earnings consistency indicators",
      "Delivery history validation",
      "Platform reputation records",
      "Portable work history creation",
    ],
    benefit: "Build a trusted work history across platforms",
    chips: ["Platform Activity", "Reputation", "Identity"],
  },
  {
    key: "freelancer" as const,
    title: "Freelancer / Contractor",
    icon: Laptop2,
    description: "Independent professional working with clients and project-based engagements.",
    details: [
      "Client verification",
      "Project history validation",
      "Portfolio credibility",
      "Contract verification",
      "Professional reputation building",
    ],
    benefit: "Show trusted proof of your work history",
    chips: ["Projects", "Clients", "Identity"],
  },
  {
    key: "student" as const,
    title: "Student / Fresher",
    icon: GraduationCap,
    description: "Currently studying or beginning your professional journey.",
    details: [
      "Education verification",
      "Certification validation",
      "Internship records",
      "Academic achievements",
      "Early trust score creation",
    ],
    benefit: "Start building credibility before your first job",
    chips: ["Education", "Certifications", "Identity"],
  },
];

interface Props {
  value: ProfileType | null;
  onChange: (v: ProfileType) => void;
}

export function ProfileTypeStep({ value, onChange }: Props) {
  const [hover, setHover] = useState<ProfileType | null>(null);
  const selected = profiles.find((p) => p.key === value) ?? profiles.find((p) => p.key === hover);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Personalize your Trust Profile
        </div>
        <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-tight leading-[1.05]">
          What best describes you?
        </h1>
        <p className="mt-3 text-base text-muted-foreground max-w-xl mx-auto">
          Your profile type helps Kairo personalize your Trust Profile and verification journey.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card/70 p-4 text-sm text-muted-foreground text-center">
        Your Trust Profile is built differently depending on how you work. Select the option that best reflects your professional identity.
      </div>

      <div className="mt-6 grid sm:grid-cols-2 gap-3">
        {profiles.map((p) => {
          const isSelected = value === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => onChange(p.key)}
              onMouseEnter={() => setHover(p.key)}
              onMouseLeave={() => setHover(null)}
              className={cn(
                "group text-left rounded-2xl border bg-card p-5 transition-all duration-300 card-lift",
                isSelected
                  ? "border-primary/60 shadow-glow bg-primary/[0.03]"
                  : "border-border hover:border-primary/30 hover:shadow-card",
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-foreground/[0.05] text-foreground",
                )}>
                  <p.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-sm leading-tight">{p.title}</div>
                    {isSelected && (
                      <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{p.description}</p>

                  <div
                    className={cn(
                      "grid transition-all duration-500 ease-out",
                      isSelected ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0",
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">What gets verified</div>
                      <ul className="mt-2 space-y-1.5">
                        {p.details.map((d) => (
                          <li key={d} className="flex items-start gap-2 text-xs">
                            <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                            <span className="text-foreground/85">{d}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-primary bg-primary/10 border border-primary/20 rounded-full px-2.5 py-1">
                        <Sparkles className="h-3 w-3" /> {p.benefit}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Trust profile preview */}
      <div className="mt-6 rounded-2xl border border-border bg-gradient-to-br from-primary/[0.04] to-transparent p-5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Your Trust Profile may include
        </div>
        <div className="mt-3 flex flex-wrap gap-2 min-h-[28px]">
          {(selected?.chips ?? profiles[0].chips).map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border text-xs font-medium text-foreground/80 transition-all"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {c}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-5 text-xs text-center text-muted-foreground">
        Your profile type only helps personalize your verification journey. You can add additional records and profile types later.
      </p>
    </div>
  );
}
