import {
  Activity,
  ArrowRight,
  Clock3,
  LayoutGrid,
  RefreshCw,
  Trash2,
  RotateCcw,
  SquareTerminal,
  Wifi,
} from "lucide-react";
import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { formatDate, formatRelativeTime, isHeartbeatFresh } from "@/utils/format";
import type { DeviceConfig, DeviceStatus } from "@shared/types";

type DeviceCardProps = {
  device: DeviceStatus;
  config?: DeviceConfig;
  onRunCommand: (deviceId: string, command: "relogin" | "reposition" | "restart_all") => void;
  onDelete: (deviceId: string) => void;
};

function getWindowsFileName(value: string) {
  return value.split(/[\\/]/).filter(Boolean).pop() ?? value;
}

function getLoginAutomationSummary(config?: DeviceConfig) {
  if (!config) {
    return "Konfig yukleniyor";
  }

  if (!config.automationRules.autoLoginEnabled) {
    return "Kapali";
  }

  if (config.automationRules.preLoginHotkeyEnabled && config.automationRules.preLoginHotkey.trim()) {
    return `Hotkey: ${config.automationRules.preLoginHotkey}`;
  }

  return "Acik";
}

function getHelperSummary(config?: DeviceConfig) {
  if (!config?.automationRules.helperAutomation.enabled) {
    return "Kapali";
  }

  const helper = config.automationRules.helperAutomation;
  if (helper.trigger === "hotkey" && helper.hotkey.trim()) {
    return `Hotkey ${helper.hotkey}`;
  }
  if (helper.trigger === "click") {
    return `Tiklama ${helper.clickX}, ${helper.clickY}`;
  }
  return "Hazir";
}

function getOperationalHint(device: DeviceStatus, config?: DeviceConfig) {
  const heartbeatMaxAgeSec = Math.max((config?.healthCheckIntervalSec ?? 5) * 4, 45);
  const workerReachable = isHeartbeatFresh(device.lastHeartbeatAt, heartbeatMaxAgeSec);

  if (!workerReachable) {
    return {
      tone: "warning",
      message:
        "Worker son heartbeat'i guncel degil. Bu durumda panelden gonderilen komutlar cihaza ulasmaz; worker'i yeniden baslatip guncel paketin token bilgisini aldigindan emin ol.",
    } as const;
  }

  if (!device.internetReachable) {
    return {
      tone: "warning",
      message: "Worker ayakta ama internet erisimi yok. Baglanti gelince relogin akisi devreye girecek.",
    } as const;
  }

  if (device.lastError) {
    return {
      tone: "error",
      message: device.lastError,
    } as const;
  }

  if (config && device.activeWindows < config.windowCount) {
    return {
      tone: "info",
      message: `Hedef ${config.windowCount} pencere. Su an ${device.activeWindows} pencere algilandi; worker eksikleri tamamlamaya calisacak.`,
    } as const;
  }

  return {
    tone: "success",
    message: "Cihaz panel ile senkron. Komutlar buradan gonderilebilir.",
  } as const;
}

const hintToneClass = {
  success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
  info: "border-sky-500/20 bg-sky-500/10 text-sky-100",
  warning: "border-amber-500/20 bg-amber-500/10 text-amber-100",
  error: "border-rose-500/20 bg-rose-500/10 text-rose-100",
} as const;

export function DeviceCard({ device, config, onRunCommand, onDelete }: DeviceCardProps) {
  const heartbeatMaxAgeSec = Math.max((config?.healthCheckIntervalSec ?? 5) * 4, 45);
  const workerReachable = isHeartbeatFresh(device.lastHeartbeatAt, heartbeatMaxAgeSec);
  const operationalHint = getOperationalHint(device, config);
  const detailItems = [
    {
      label: "Heartbeat",
      value: formatRelativeTime(device.lastHeartbeatAt),
      helper: formatDate(device.lastHeartbeatAt),
      icon: Clock3,
    },
    {
      label: "Hedef pencere",
      value: config ? `${config.windowCount}` : "-",
      helper: config ? `Kontrol ${config.healthCheckIntervalSec} sn` : "Konfig bekleniyor",
      icon: LayoutGrid,
    },
    {
      label: "Aktif pencere",
      value: `${device.activeWindows}`,
      helper: `Retry ${device.retriesToday}`,
      icon: Activity,
    },
    {
      label: "Login otomasyonu",
      value: getLoginAutomationSummary(config),
      helper: `Helper ${getHelperSummary(config)}`,
      icon: RefreshCw,
    },
  ];

  return (
    <article className="group rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.32)] transition hover:border-sky-400/20 hover:bg-white/[0.05]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-400">
            <Wifi className={cn("h-3.5 w-3.5", device.internetReachable ? "text-emerald-300" : "text-rose-300")} />
            <span>{device.osVersion}</span>
            <span className="text-slate-600">•</span>
            <span>{workerReachable && device.online ? "Worker bagli" : "Worker gorunmuyor"}</span>
          </div>
          <h3 className="mt-3 text-lg font-semibold text-white">{device.name}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-300">
            <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-xs text-slate-300">
              {device.id}
            </span>
            <span>{getWindowsFileName(device.exePath)}</span>
          </div>
          <p className="mt-2 max-w-2xl break-all text-sm leading-6 text-slate-400">{device.exePath}</p>
        </div>
        <StatusBadge state={device.automationState} internetReachable={device.internetReachable} />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {detailItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-white/8 bg-slate-950/50 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </div>
              <div className="mt-2 text-xl font-semibold text-white">{item.value}</div>
              <div className="mt-2 text-xs leading-5 text-slate-400">{item.helper}</div>
            </div>
          );
        })}
      </div>

      <div className={cn("mt-4 rounded-2xl border px-4 py-3 text-sm leading-6", hintToneClass[operationalHint.tone])}>
        {operationalHint.message}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!workerReachable}
          onClick={() => onRunCommand(device.id, "relogin")}
          className="inline-flex items-center gap-2 rounded-full bg-sky-400 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
        >
          <RefreshCw className="h-4 w-4" />
          Relogin
        </button>
        <button
          type="button"
          disabled={!workerReachable}
          onClick={() => onRunCommand(device.id, "restart_all")}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-white/20 hover:bg-white/5 disabled:cursor-not-allowed disabled:border-white/5 disabled:text-slate-500"
        >
          <RotateCcw className="h-4 w-4" />
          Yeniden baslat
        </button>
        <button
          type="button"
          disabled={!workerReachable}
          onClick={() => onRunCommand(device.id, "reposition")}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-white/20 hover:bg-white/5 disabled:cursor-not-allowed disabled:border-white/5 disabled:text-slate-500"
        >
          <LayoutGrid className="h-4 w-4" />
          Pencere hizala
        </button>
        <button
          type="button"
          onClick={() => onDelete(device.id)}
          className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/10"
        >
          <Trash2 className="h-4 w-4" />
          Cihazi sil
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
