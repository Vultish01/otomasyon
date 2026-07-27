import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, Download, Monitor, RefreshCcw, ShieldCheck, TimerReset } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { DeviceEvent, DeviceRegistrationRequest, DeviceStatus } from "@shared/types";
import { DeviceCard } from "@/components/DeviceCard";
import { LayoutShell } from "@/components/LayoutShell";
import { SectionCard } from "@/components/SectionCard";
import { useControlCenterStore } from "@/store/useControlCenterStore";
import { formatDate } from "@/utils/format";

const initialRegistrationForm: DeviceRegistrationRequest = {
  name: "",
  osVersion: "Windows 11 Pro",
  exePath: "",
  windowCount: 4,
  healthCheckIntervalSec: 5,
  reconnectCooldownSec: 15,
  launchArgs: [],
};

export default function Dashboard() {
  const navigate = useNavigate();
  const devices = useControlCenterStore((state) => state.devices);
  const configs = useControlCenterStore((state) => state.configs);
  const events = useControlCenterStore((state) => state.events);
  const runCommand = useControlCenterStore((state) => state.runCommand);
  const runBulkRelogin = useControlCenterStore((state) => state.runBulkRelogin);
  const loadDashboardData = useControlCenterStore((state) => state.loadDashboardData);
  const registerNewDevice = useControlCenterStore((state) => state.registerNewDevice);
  const claimDevice = useControlCenterStore((state) => state.claimDevice);
  const deleteDevice = useControlCenterStore((state) => state.deleteDevice);
  const isLoadingDevices = useControlCenterStore((state) => state.isLoadingDevices);
  const isRegisteringDevice = useControlCenterStore((state) => state.isRegisteringDevice);
  const lastSyncError = useControlCenterStore((state) => state.lastSyncError);

  const [registrationForm, setRegistrationForm] = useState<DeviceRegistrationRequest>(initialRegistrationForm);
  const [claimForm, setClaimForm] = useState({ deviceId: "", machineKey: "" });

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  const summaryItems = useMemo(
    () => [
      {
        label: "Bagli cihaz",
        value: `${devices.length}`,
        icon: Monitor,
        accent: "from-sky-400/20 to-transparent text-sky-100",
      },
      {
        label: "Aktif koruma",
        value: "Oturum + Token",
        icon: ShieldCheck,
        accent: "from-emerald-400/20 to-transparent text-emerald-100",
      },
      {
        label: "Bekleyen retry",
        value: `${devices.reduce((sum, item) => sum + item.retriesToday, 0)}`,
        icon: TimerReset,
        accent: "from-amber-400/20 to-transparent text-amber-100",
      },
    ],
    [devices],
  );

  async function handleRegisterDevice() {
    try {
      const deviceId = await registerNewDevice(registrationForm);
      setRegistrationForm(initialRegistrationForm);
      navigate(`/devices/${deviceId}`);
    } catch {
      return;
    }
  }

  async function handleDeleteDevice(device: DeviceStatus) {
    const confirmed = window.confirm(
      `${device.name} cihazini panelden kaldirmak istiyor musun? Bu islem loglari ve komut gecmisini de siler.`,
    );
    if (!confirmed) {
      return;
    }
    try {
      await deleteDevice(device.id);
    } catch {
      return;
    }
  }

  async function handleClaimDevice() {
    if (!claimForm.deviceId.trim() || !claimForm.machineKey.trim()) {
      return;
    }
    try {
      await claimDevice({
        deviceId: claimForm.deviceId.trim(),
        machineKey: claimForm.machineKey.trim(),
      });
      setClaimForm({ deviceId: "", machineKey: "" });
    } catch {
      return;
    }
  }

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
                Internet koptugunda bile Windows makinelerdeki 4'lu pencere duzenini ayakta tutan panel.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                Buradan cihazlari gorebilir, komut gonderebilir ve otomasyon ayarlarini yonetebilirsin.
                Windows kurulum dosyasi indirmek icin Ayarlar ekranindaki kurulum merkezini kullan.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void runBulkRelogin()}
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

        <SectionCard eyebrow="Sayfa rehberi" title="Bu ekranda neyi nerede yonetirsin?">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-[24px] border border-white/8 bg-slate-950/40 p-5">
              <div className="text-sm font-semibold text-white">Ust kisim</div>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Sistem genel ozetini, kayitli cihaz sayisini ve toplu relogin gibi hizli komutlari gosterir.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-slate-950/40 p-5">
              <div className="text-sm font-semibold text-white">Canli cihazlar</div>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Her Windows PC icin online durumu, hata bilgisi ve manuel komut butonlari burada yer alir.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-slate-950/40 p-5">
              <div className="text-sm font-semibold text-white">Worker olaylari</div>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Logout, restart, login denemesi ve benzeri son aksiyonlari tarih sirasiyla burada izlersin.
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard eyebrow="Opsiyonel manuel kayit" title="Istersen panelden de Windows worker kaydi olustur">
          <div className="mb-5 rounded-[24px] border border-amber-500/15 bg-amber-500/[0.06] px-5 py-4 text-sm leading-7 text-slate-200">
            Bu alan
            {" "}
            <span className="font-semibold text-white">Windows kurulum paketi indirmez</span>
            . Sadece panelde elle cihaz karti acmak icindir. Gercek kurulum icin
            {" "}
            <a href="/settings" className="font-semibold text-sky-300 underline decoration-sky-400/40 underline-offset-4">
              Ayarlar &gt; Windows kurulum merkezi
            </a>
            {" "}
            ekranindaki ZIP paketini indirip BAT dosyasini Windows'ta calistir.
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-200">Cihaz adi</span>
              <input
                value={registrationForm.name}
                onChange={(event) => setRegistrationForm((state) => ({ ...state, name: event.target.value }))}
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                placeholder="Ofis PC 01"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-200">Isletim sistemi</span>
              <input
                value={registrationForm.osVersion}
                onChange={(event) => setRegistrationForm((state) => ({ ...state, osVersion: event.target.value }))}
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                placeholder="Windows 11 Pro"
              />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-medium text-slate-200">EXE yolu</span>
              <input
                value={registrationForm.exePath}
                onChange={(event) => setRegistrationForm((state) => ({ ...state, exePath: event.target.value }))}
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                placeholder="C:\\Program Files\\Uygulama\\app.exe"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-200">Pencere sayisi</span>
              <input
                type="number"
                min={1}
                max={4}
                value={registrationForm.windowCount}
                onChange={(event) =>
                  setRegistrationForm((state) => ({ ...state, windowCount: Number(event.target.value) || 1 }))
                }
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-200">Kontrol araligi (sn)</span>
              <input
                type="number"
                min={2}
                max={300}
                value={registrationForm.healthCheckIntervalSec}
                onChange={(event) =>
                  setRegistrationForm((state) => ({
                    ...state,
                    healthCheckIntervalSec: Number(event.target.value) || 5,
                  }))
                }
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-200">Reconnect cooldown (sn)</span>
              <input
                type="number"
                min={5}
                max={600}
                value={registrationForm.reconnectCooldownSec}
                onChange={(event) =>
                  setRegistrationForm((state) => ({
                    ...state,
                    reconnectCooldownSec: Number(event.target.value) || 15,
                  }))
                }
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-200">Launch argumanlari</span>
              <input
                value={registrationForm.launchArgs.join(" ")}
                onChange={(event) =>
                  setRegistrationForm((state) => ({
                    ...state,
                    launchArgs: event.target.value.trim() ? event.target.value.trim().split(/\s+/) : [],
                  }))
                }
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                placeholder="--legacy-render --foo"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!registrationForm.name || !registrationForm.exePath || isRegisteringDevice}
              onClick={() => void handleRegisterDevice()}
              className="inline-flex items-center gap-2 rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
            >
              <Download className="h-4 w-4" />
              Sadece cihaz karti olustur
            </button>
            <a
              href="/downloads/otologin-windows-worker.zip?v=20260727-4"
              download
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-slate-100 transition hover:border-white/20 hover:bg-white/5"
            >
              <Download className="h-4 w-4" />
              Windows kurulum paketini indir
            </a>
            <p className="text-sm leading-7 text-slate-400">
              Normal akista Windows kurulum paketi cihazi otomatik kaydeder. Bu alan ise manuel
              onboarding veya test cihazlari icin yedek yol olarak kalir.
            </p>
          </div>
        </SectionCard>

        <SectionCard eyebrow="Gorunmeyen cihaz eslestirme" title="Windows'ta kayit olmus ama panelde gorunmeyen cihazi hesabina bagla">
          <div className="rounded-[24px] border border-sky-400/15 bg-sky-400/[0.05] px-5 py-4 text-sm leading-7 text-slate-200">
            Kurulum konsolunda gorunen <span className="font-semibold text-white">device id</span> ile
            {" "}
            <code className="rounded bg-slate-950/70 px-2 py-1 text-sky-200">worker-config.json</code>
            {" "}
            ya da
            {" "}
            <code className="rounded bg-slate-950/70 px-2 py-1 text-sky-200">machine-identity.json</code>
            {" "}
            icindeki <span className="font-semibold text-white">machine_key</span> degerini buraya gir.
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-200">Device ID</span>
              <input
                value={claimForm.deviceId}
                onChange={(event) => setClaimForm((state) => ({ ...state, deviceId: event.target.value }))}
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                placeholder="desktop-123abc"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-200">Machine Key</span>
              <input
                value={claimForm.machineKey}
                onChange={(event) => setClaimForm((state) => ({ ...state, machineKey: event.target.value }))}
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                placeholder="win-acer-4f8f..."
              />
            </label>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!claimForm.deviceId.trim() || !claimForm.machineKey.trim()}
              onClick={() => void handleClaimDevice()}
              className="inline-flex items-center gap-2 rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
            >
              Cihazi hesabima bagla
            </button>
            <p className="text-sm leading-7 text-slate-400">
              Bu islem sadece fiziksel olarak sende olan Windows makinedeki machine key dogruysa calisir.
            </p>
          </div>
        </SectionCard>

        {lastSyncError ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {lastSyncError}
          </div>
        ) : null}

        <SectionCard
          eyebrow="Canli cihazlar"
          title="Windows makineler ve otomasyon durumu"
          action={
            <div className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300">
              {isLoadingDevices ? "Yukleniyor..." : `Son yenileme: ${formatDate(new Date().toISOString())}`}
            </div>
          }
        >
          <div className="grid gap-5 xl:grid-cols-2">
            {devices.length > 0 ? (
                devices.map((device: DeviceStatus) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  config={configs[device.id]}
                  onRunCommand={(deviceId, command) => void runCommand(deviceId, command)}
                  onDelete={(deviceId) => {
                    const target = devices.find((item) => item.id === deviceId);
                    if (target) {
                      void handleDeleteDevice(target);
                    }
                  }}
                />
              ))
            ) : (
              <div className="rounded-[28px] border border-dashed border-white/10 bg-slate-950/40 p-8 text-sm leading-7 text-slate-300 xl:col-span-2">
                Henuz bagli cihaz yok. Once Windows kurulum sihirbazindan paketi indir, hedef PC'de kurulumu
                tamamla; cihaz otomatik olarak burada gorunecek.
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard eyebrow="Worker olaylari" title="Son saglik ve otomasyon olaylari" className="overflow-hidden">
          <div id="olay-akisi" className="space-y-3">
            {events.length > 0 ? (
                events.map((event: DeviceEvent) => (
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
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 px-4 py-6 text-sm text-slate-300">
                Henuz worker olayi yok. Ilk cihaz kuruldugunda heartbeat ve login olaylari burada akmaya baslayacak.
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </LayoutShell>
  );
}
