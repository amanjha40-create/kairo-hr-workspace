import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HelpCircle, BookOpen, MessageCircle, Keyboard } from "lucide-react";
import { getMarketingWebsiteUrl } from "@/lib/app-config";

export function HelpWidget() {
  const marketingWebsiteUrl = getMarketingWebsiteUrl();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="fixed bottom-5 right-5 z-40 h-11 w-11 rounded-full bg-foreground text-background shadow-lg hover:scale-105 transition-transform flex items-center justify-center" aria-label="Help">
          <HelpCircle className="h-5 w-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" side="top" className="w-72 rounded-2xl p-2">
        <div className="p-3">
          <div className="text-sm font-semibold">Need a hand?</div>
          <p className="text-xs text-muted-foreground mt-0.5">First time here? Start with the tour or search docs.</p>
        </div>
        <div className="space-y-0.5">
          <Row icon={BookOpen} label="Documentation" href={`${marketingWebsiteUrl}/help-center`} />
          <Row icon={MessageCircle} label="Contact support" href={`${marketingWebsiteUrl}/contact`} />
          <Row icon={Keyboard} label="Keyboard shortcuts" hint="/ · N · G" />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Row({ icon: Icon, label, href, hint }: { icon: React.ElementType; label: string; href?: string; hint?: string }) {
  const inner = (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-foreground/[0.04] text-sm cursor-pointer">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1">{label}</span>
      {hint && <span className="text-[10px] text-muted-foreground font-mono">{hint}</span>}
    </div>
  );
  if (href) return <a href={href}>{inner}</a>;
  return inner;
}
