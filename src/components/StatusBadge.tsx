import { AlertTriangle, CheckCircle2, Clock3, LoaderCircle, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AutomationState } from "@shared/types";

type StatusBadgeProps = {
  state: AutomationState;
  internetReachable?: boolean;
};

const stateMap: Record<
  AutomationState,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  idle: {
    label: "Hazir",
    icon: CheckCircle2,
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  },
  checking: {
    label: "Kontrol ediyor",
    icon: Clock3,
    className: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  },
  relaunching: {
    label: "Yeniden aciliyor",
    icon: LoaderCircle,
    className: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  },
  logging_in: {
    label: "Login oluyor",
    icon: LoaderCircle,
    className: "border-indigo-500/30 bg-indigo-500/10 text-indigo-200",
  },
  positioning: {
    label: "Hizalaniyor",
    icon: LoaderCircle,
    className: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
  },
  error: {
    label: "Hata",
    icon: AlertTriangle,
    className: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  },
};

export function StatusBadge({ state, internetReachable = true }: StatusBadgeProps) {
  const config = stateMap[state];
  const Icon = internetReachable ? config.icon : WifiOff;
  const spinningStates: AutomationState[] = ["checking", "relaunching", "logging_in", "positioning"];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
        !internetReachable
          ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
          : config.className,
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", spinningStates.includes(state) && "animate-spin-slow")} />
      {internetReachable ? config.label : "Internet yok"}
    </span>
  );
}
