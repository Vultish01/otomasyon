import { AlertTriangle, ArrowUpRight, Monitor, RefreshCcw, ShieldCheck, TimerReset } from "lucide-react";
import { DeviceCard } from "@/components/DeviceCard";
import { LayoutShell } from "@/components/LayoutShell";
import { SectionCard } from "@/components/SectionCard";
import { useControlCenterStore } from "@/store/useControlCenterStore";
import { formatDate } from "@/utils/format";

const summaryItems = [
  {
    label: "Bagli cihaz",
    value: "3",
    icon: Monitor,
    accent: "from-sky-400/20 to-transparent text-sky-100",
  },
  {
    label: "Aktif koruma",
    value: "2FA + Token",
    icon: ShieldCheck,
    accent: "from-emerald-400/20 to-transparent text-emerald-100",
  },
  {
    label: "Bekleyen retry",
    value: "7",
    icon: TimerReset,
    accent: "from-amber-400/20 to-transparent text-amber-100",
  },
];

export default function Dashboard() {
  const devices = useControlCenterStore((state) => state.devices);
  const events = useControlCenterStore((state) => state.events);
  const runCommand = useControlCenterStore((state) => state.runCommand);
  const runBulkRelogin = useControlCenterStore((state) => state.runBulkRelogin);

  return (
    <LayoutShell>
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(135deg,_rgba(15,23,42,0.96),_rgba(3,7,18,0.9))] p-8 shadow-[0_32px_120px_rgba(0,0,0,0.35)]">
          <div className="grid gap-8 xl:grid-cols-[1.5fr_1fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-sky-200">
                Canli kontrol
              </div>
              <h2 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white">
                Internet koptugunda bile 3 Windows makinedeki 4'lu pencere duzenini ayakta tutan panel.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                Bu MVP, relogin, yeniden acma, secim ekrani ilerletme ve pencere konumlandirma
                akislarini tek merkezden yonetmek icin tasarlandi.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={runBulkRelogin}
                  className="inline-flex items-center gap-2 rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Tum cihazlarda relogin
                </button>
                <a
                  href="#olay-akisi"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-slate-100 transition hover:border-white/20 hover:bg-white/5"
                >
                  Olay akisina in
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="grid gap-4">
              {summaryItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className={`rounded-[28px] border border-white/10 bg-gradient-to-br ${item.accent} p-5`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-[0.22em] text-slate-400">{item.label}</div>
                        <div className="mt-3 text-2xl font-semibold text-white">{item.value}</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <SectionCard
          eyebrow="Canli cihazlar"
          title="Windows makineler ve otomasyon durumu"
          action={
            <div className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300">
              Son yenileme: {formatDate(new Date().toISOString())}
            </div>
          }
        >
          <div className="grid gap-5 xl:grid-cols-2">
            {devices.map((device) => (
              <DeviceCard key={device.id} device={device} onRunCommand={runCommand} />
            ))}
          </div>
        </SectionCard>

        <SectionCard eyebrow="Worker olaylari" title="Son saglik ve otomasyon olaylari" className="overflow-hidden">
          <div id="olay-akisi" className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/8 bg-slate-950/50 px-4 py-4"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 rounded-2xl border border-white/10 bg-white/[0.04] p-2">
                    <AlertTriangle className="h-4 w-4 text-sky-200" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white">{event.message}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                      {event.deviceId} • {event.eventType}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-400">{formatDate(event.createdAt)}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </LayoutShell>
  );
}
