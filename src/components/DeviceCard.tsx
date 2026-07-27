import { ArrowRight, LayoutGrid, RefreshCw, RotateCcw, SquareTerminal, Wifi } from "lucide-react";
import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import type { DeviceStatus } from "@shared/types";

type DeviceCardProps = {
  device: DeviceStatus;
  onRunCommand: (deviceId: string, command: "relogin" | "reposition" | "restart_all") => void;
};

const metricLabels = [
  { key: "activeWindows", label: "Aktif pencere" },
  { key: "retriesToday", label: "Bugunku retry" },
] as const;

export function DeviceCard({ device, onRunCommand }: DeviceCardProps) {
  return (
    <article className="group rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.32)] transition hover:border-sky-400/20 hover:bg-white/[0.05]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-400">
            <Wifi className={cn("h-3.5 w-3.5", device.internetReachable ? "text-emerald-300" : "text-rose-300")} />
            {device.osVersion}
          </div>
          <h3 className="mt-3 text-lg font-semibold text-white">{device.name}</h3>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-300">{device.exePath}</p>
        </div>
        <StatusBadge state={device.automationState} internetReachable={device.internetReachable} />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {metricLabels.map((metric) => (
          <div key={metric.key} className="rounded-2xl border border-white/8 bg-slate-950/50 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{metric.label}</div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {device[metric.key]}
            </div>
          </div>
        ))}
      </div>

      {device.lastError ? (
        <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {device.lastError}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onRunCommand(device.id, "relogin")}
          className="inline-flex items-center gap-2 rounded-full bg-sky-400 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-300"
        >
          <RefreshCw className="h-4 w-4" />
          Relogin
        </button>
        <button
          type="button"
          onClick={() => onRunCommand(device.id, "restart_all")}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-white/20 hover:bg-white/5"
        >
          <RotateCcw className="h-4 w-4" />
          Yeniden baslat
        </button>
        <button
          type="button"
          onClick={() => onRunCommand(device.id, "reposition")}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-white/20 hover:bg-white/5"
        >
          <LayoutGrid className="h-4 w-4" />
          Pencere hizala
        </button>
      </div>

      <Link
        to={`/devices/${device.id}`}
        className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-sky-200 transition group-hover:text-white"
      >
        <SquareTerminal className="h-4 w-4" />
        Cihaz detayina git
        <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}
