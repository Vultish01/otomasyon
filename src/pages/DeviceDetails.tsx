import { useMemo, useState } from "react";
import { ArrowLeft, FolderSearch, Play, RefreshCcw, Save, Waypoints } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { LayoutShell } from "@/components/LayoutShell";
import { SectionCard } from "@/components/SectionCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useControlCenterStore } from "@/store/useControlCenterStore";
import { formatDate, formatPosition } from "@/utils/format";

export default function DeviceDetails() {
  const { deviceId } = useParams();
  const devices = useControlCenterStore((state) => state.devices);
  const configs = useControlCenterStore((state) => state.configs);
  const runCommand = useControlCenterStore((state) => state.runCommand);
  const saveExePath = useControlCenterStore((state) => state.saveExePath);

  const device = devices.find((item) => item.id === deviceId);
  const config = deviceId ? configs[deviceId] : undefined;
  const [exePath, setExePath] = useState(config?.exePath ?? "");

  const stats = useMemo(
    () => [
      { label: "Heartbeat", value: device ? formatDate(device.lastHeartbeatAt) : "-" },
      { label: "Kontrol araligi", value: config ? `${config.healthCheckIntervalSec} sn` : "-" },
      { label: "Cooldown", value: config ? `${config.reconnectCooldownSec} sn` : "-" },
      { label: "Pencere sayisi", value: config ? `${config.windowCount}` : "-" },
    ],
    [config, device],
  );

  if (!device || !config || !deviceId) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Panele don
            </Link>
            <h2 className="mt-3 text-3xl font-semibold text-white">{device.name}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">
              Bu ekranda cihaz bazli EXE yolu, pencere profilleri ve manuel operasyon komutlari
              yonetilir.
            </p>
          </div>
          <StatusBadge state={device.automationState} internetReachable={device.internetReachable} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <SectionCard eyebrow="Cihaz konfigrasyonu" title="EXE yolu ve saglik ayarlari">
            <div className="grid gap-4 md:grid-cols-2">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/8 bg-slate-950/50 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{stat.label}</div>
                  <div className="mt-2 text-lg font-semibold text-white">{stat.value}</div>
                </div>
              ))}
            </div>

            <label className="mt-6 block">
              <span className="text-sm font-medium text-slate-200">EXE dosya yolu</span>
              <div className="mt-3 flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <FolderSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={exePath}
                    onChange={(event) => setExePath(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 pl-11 pr-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                    placeholder="C:\\Program Files\\..."
                  />
                </div>
                <button
                  type="button"
                  onClick={() => saveExePath(deviceId, exePath)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
                >
                  <Save className="h-4 w-4" />
                  Kaydet
                </button>
              </div>
            </label>
          </SectionCard>

          <SectionCard eyebrow="Komutlar" title="Manuel tetikleme">
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => runCommand(deviceId, "start_exe")}
                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-left transition hover:bg-white/[0.05]"
              >
                <div>
                  <div className="text-sm font-medium text-white">Sadece EXE ac</div>
                  <div className="mt-1 text-xs text-slate-400">Worker eski sureci elle kapatmadan yeni acilis dener.</div>
                </div>
                <Play className="h-4 w-4 text-sky-200" />
              </button>
              <button
                type="button"
                onClick={() => runCommand(deviceId, "relogin")}
                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-left transition hover:bg-white/[0.05]"
              >
                <div>
                  <div className="text-sm font-medium text-white">Relogin baslat</div>
                  <div className="mt-1 text-xs text-slate-400">Logout tespiti beklemeden giris akisina gecilir.</div>
                </div>
                <RefreshCcw className="h-4 w-4 text-sky-200" />
              </button>
              <button
                type="button"
                onClick={() => runCommand(deviceId, "reposition")}
                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-left transition hover:bg-white/[0.05]"
              >
                <div>
                  <div className="text-sm font-medium text-white">Pencereleri hizala</div>
                  <div className="mt-1 text-xs text-slate-400">Win32 API ile 4 ceyrege yeniden yerlestir.</div>
                </div>
                <Waypoints className="h-4 w-4 text-sky-200" />
              </button>
            </div>
          </SectionCard>
        </div>

        <SectionCard eyebrow="Pencere profilleri" title="Login sonrasi secim ve konum kurallari">
          <div className="grid gap-4 lg:grid-cols-2">
            {config.profiles.map((profile) => (
              <div key={profile.id} className="rounded-[24px] border border-white/8 bg-slate-950/50 p-5">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Pencere {profile.slot}</div>
                  <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                    {formatPosition(profile.position)}
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-medium text-white">{profile.email}</div>
                  <div className="mt-1 text-xs text-slate-400">Credential: {profile.credentialId}</div>
                </div>
                <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-200">
                  Login sonrasi secim: <span className="font-medium text-white">{profile.postLoginChoice ?? "-"}</span>
                </div>
                <div className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">
                  Son durum: {profile.lastAction}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </LayoutShell>
  );
}
