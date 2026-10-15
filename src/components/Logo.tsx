import logo from "@/assets/kairoid-logo-primary.png";
import { Link } from "@tanstack/react-router";

export function Logo({ className = "h-5" }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="KairoID home"
      className="inline-flex items-center shrink-0 -ml-1 px-1 py-1 rounded-md hover:bg-foreground/[0.04] active:bg-foreground/[0.06] transition-colors"
    >
      <img
        src={logo}
        alt="KairoID"
        width={728}
        height={192}
        className={`${className} w-auto object-contain select-none block`}
        draggable={false}
        decoding="async"
        fetchPriority="high"
      />
    </Link>
  );
}
