import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Play, RefreshCcw, Save, Waypoints } from "lucide-react";
import type { DeviceConfig, WindowProfile } from "@shared/types";
import { Link, Navigate, useParams } from "react-router-dom";
import { LayoutShell } from "@/components/LayoutShell";
import { SectionCard } from "@/components/SectionCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useControlCenterStore } from "@/store/useControlCenterStore";
import { downloadJson } from "@/utils/download";
import { formatDate, formatPosition } from "@/utils/format";

function createEmptyProfile(deviceId: string, slot: 1 | 2 | 3 | 4): WindowProfile {
  const positions: WindowProfile["position"][] = ["top_left", "top_right", "bottom_left", "bottom_right"];
  return {
    id: `${deviceId}-slot-${slot}`,
    deviceId,
    slot,
    email: "",
    credentialId: "",
    postLoginChoice: "",
    position: positions[slot - 1],
    lastAction: "Beklemede",
  };
}

function parseKeywordInput(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function DeviceDetails() {
  const { deviceId } = useParams();
  const devices = useControlCenterStore((state) => state.devices);
  const configs = useControlCenterStore((state) => state.configs);
  const runCommand = useControlCenterStore((state) => state.runCommand);
  const saveDeviceConfig = useControlCenterStore((state) => state.saveDeviceConfig);
  const loadDeviceDetail = useControlCenterStore((state) => state.loadDeviceDetail);
  const loadWorkerConfig = useControlCenterStore((state) => state.loadWorkerConfig);
  const workerConfig = useControlCenterStore((state) =>
    deviceId ? state.workerConfigByDeviceId[deviceId] : undefined,
  );
  const isLoadingDeviceDetail = useControlCenterStore((state) => state.isLoadingDeviceDetail);
  const isSavingConfig = useControlCenterStore((state) => state.isSavingConfig);
  const lastSyncError = useControlCenterStore((state) => state.lastSyncError);

  const device = devices.find((item) => item.id === deviceId);
  const config = deviceId ? configs[deviceId] : undefined;

  const [draft, setDraft] = useState<DeviceConfig | null>(config ?? null);

  useEffect(() => {
    if (!deviceId) {
      return;
    }
    void loadDeviceDetail(deviceId);
    void loadWorkerConfig(deviceId);
  }, [deviceId, loadDeviceDetail, loadWorkerConfig]);

  useEffect(() => {
    if (config) {
      const slots = Array.from({ length: config.windowCount }, (_, index) => (index + 1) as 1 | 2 | 3 | 4);
      const normalizedProfiles = slots.map(
        (slot) => config.profiles.find((profile) => profile.slot === slot) ?? createEmptyProfile(config.deviceId, slot),
      );
      setDraft({
        ...config,
        profiles: normalizedProfiles,
      });
    }
  }, [config]);

  const stats = useMemo(
    () => [
      { label: "Heartbeat", value: device ? formatDate(device.lastHeartbeatAt) : "-" },
      { label: "Kontrol araligi", value: draft ? `${draft.healthCheckIntervalSec} sn` : "-" },
      { label: "Cooldown", value: draft ? `${draft.reconnectCooldownSec} sn` : "-" },
      { label: "Pencere sayisi", value: draft ? `${draft.windowCount}` : "-" },
    ],
    [draft, device],
  );

  if (!deviceId) {
    return <Navigate to="/dashboard" replace />;
  }

  if ((!device || !draft) && isLoadingDeviceDetail) {
    return (
      <LayoutShell>
        <div className="rounded-2xl border border-white/8 bg-slate-950/50 px-5 py-4 text-sm text-slate-300">
          Cihaz detaylari yukleniyor...
        </div>
      </LayoutShell>
    );
  }

  if (!device || !draft) {
    return <Navigate to="/dashboard" replace />;
  }

  function updateProfile(slot: number, field: keyof WindowProfile, value: string) {
    setDraft((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        profiles: current.profiles.map((profile) =>
          profile.slot === slot ? { ...profile, [field]: value } : profile,
        ),
      };
    });
  }

  function handleWindowCountChange(nextCount: number) {
    const safeCount = Math.min(4, Math.max(1, nextCount));
    setDraft((current) => {
      if (!current) {
        return current;
      }
      const nextProfiles = Array.from({ length: safeCount }, (_, index) => {
        const slot = (index + 1) as 1 | 2 | 3 | 4;
        return current.profiles.find((profile) => profile.slot === slot) ?? createEmptyProfile(current.deviceId, slot);
      });
      return {
        ...current,
        windowCount: safeCount,
        profiles: nextProfiles,
      };
    });
  }

  async function handleSave() {
    await saveDeviceConfig(draft);
  }

  function handleDownloadWorkerConfig() {
    if (!workerConfig) {
      return;
    }
    downloadJson(`worker-config-${deviceId}.json`, {
      api_base_url: workerConfig.apiBaseUrl,
      device_id: workerConfig.deviceId,
      machine_key: workerConfig.machineKey,
      window_count: workerConfig.windowCount,
      health_check_interval_sec: workerConfig.healthCheckIntervalSec,
      reconnect_cooldown_sec: workerConfig.reconnectCooldownSec,
      exe_path: workerConfig.exePath,
      launch_args: workerConfig.launchArgs,
      automation_rules: {
        auto_login_enabled: workerConfig.automationRules.autoLoginEnabled,
        login_window_keywords: workerConfig.automationRules.loginWindowKeywords,
        success_window_keywords: workerConfig.automationRules.successWindowKeywords,
        email_field_hints: workerConfig.automationRules.emailFieldHints,
        password_field_hints: workerConfig.automationRules.passwordFieldHints,
        submit_button_hints: workerConfig.automationRules.submitButtonHints,
        relaunch_wait_sec: workerConfig.automationRules.relaunchWaitSec,
        post_login_wait_sec: workerConfig.automationRules.postLoginWaitSec,
        pre_login_hotkey_enabled: workerConfig.automationRules.preLoginHotkeyEnabled,
        pre_login_hotkey: workerConfig.automationRules.preLoginHotkey,
        helper_automation: {
          enabled: workerConfig.automationRules.helperAutomation.enabled,
          program_path: workerConfig.automationRules.helperAutomation.programPath,
          launch_args: workerConfig.automationRules.helperAutomation.launchArgs,
          trigger: workerConfig.automationRules.helperAutomation.trigger,
          hotkey: workerConfig.automationRules.helperAutomation.hotkey,
          click_x: workerConfig.automationRules.helperAutomation.clickX,
          click_y: workerConfig.automationRules.helperAutomation.clickY,
          click_button: workerConfig.automationRules.helperAutomation.clickButton,
          wait_after_launch_sec: workerConfig.automationRules.helperAutomation.waitAfterLaunchSec,
        },
      },
      profiles: workerConfig.profiles.map((profile: WindowProfile) => ({
        id: profile.id,
        device_id: profile.deviceId,
        slot: profile.slot,
        email: profile.email,
        credential_id: profile.credentialId,
        post_login_choice: profile.postLoginChoice,
        position: profile.position,
        last_action: profile.lastAction,
      })),
    });
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
              Bu ekranda cihaz bazli EXE yolu, pencere profilleri ve worker konfigrasyonu yonetilir.
            </p>
          </div>
          <StatusBadge state={device.automationState} internetReachable={device.internetReachable} />
        </div>

        {lastSyncError ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {lastSyncError}
          </div>
        ) : null}

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

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-slate-200">EXE dosya yolu</span>
                <input
                  value={draft.exePath}
                  onChange={(event) => setDraft((current) => (current ? { ...current, exePath: event.target.value } : current))}
                  className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                  placeholder="C:\\Program Files\\..."
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-200">Pencere sayisi</span>
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={draft.windowCount}
                  onChange={(event) => handleWindowCountChange(Number(event.target.value) || 1)}
                  className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-200">Kontrol araligi (sn)</span>
                <input
                  type="number"
                  min={2}
                  max={300}
                  value={draft.healthCheckIntervalSec}
                  onChange={(event) =>
                    setDraft((current) =>
                      current ? { ...current, healthCheckIntervalSec: Number(event.target.value) || 5 } : current,
                    )
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
                  value={draft.reconnectCooldownSec}
                  onChange={(event) =>
                    setDraft((current) =>
                      current ? { ...current, reconnectCooldownSec: Number(event.target.value) || 15 } : current,
                    )
                  }
                  className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-slate-200">Launch argumanlari</span>
                <input
                  value={draft.launchArgs.join(" ")}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            launchArgs: event.target.value.trim() ? event.target.value.trim().split(/\s+/) : [],
                          }
                        : current,
                    )
                  }
                  className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                  placeholder="--legacy-render --foo"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={isSavingConfig}
                onClick={() => void handleSave()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
              >
                <Save className="h-4 w-4" />
                {isSavingConfig ? "Kaydediliyor..." : "Konfigrasyonu kaydet"}
              </button>
              <button
                type="button"
                onClick={handleDownloadWorkerConfig}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/5"
              >
                <Download className="h-4 w-4" />
                Worker config indir
              </button>
            </div>
          </SectionCard>

          <SectionCard eyebrow="Komutlar" title="Manuel tetikleme">
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => void runCommand(deviceId, "start_exe")}
                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-left transition hover:bg-white/[0.05]"
              >
                <div>
                  <div className="text-sm font-medium text-white">Sadece EXE ac</div>
                  <div className="mt-1 text-xs text-slate-400">Worker mevcut sureci koruyarak yeni baslatma dener.</div>
                </div>
                <Play className="h-4 w-4 text-sky-200" />
              </button>
              <button
                type="button"
                onClick={() => void runCommand(deviceId, "relogin")}
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
                onClick={() => void runCommand(deviceId, "reposition")}
                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-left transition hover:bg-white/[0.05]"
              >
                <div>
                  <div className="text-sm font-medium text-white">Pencereleri hizala</div>
                  <div className="mt-1 text-xs text-slate-400">Win32 katmani ile ceyreklere yeniden yerlestir.</div>
                </div>
                <Waypoints className="h-4 w-4 text-sky-200" />
              </button>
              <button
                type="button"
                onClick={() => void runCommand(deviceId, "run_helper")}
                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-left transition hover:bg-white/[0.05]"
              >
                <div>
                  <div className="text-sm font-medium text-white">Yardimci otomasyonu calistir</div>
                  <div className="mt-1 text-xs text-slate-400">Ek programi acip hotkey veya tiklama adimini dener.</div>
                </div>
                <Play className="h-4 w-4 text-sky-200" />
              </button>
            </div>
          </SectionCard>
        </div>

        <SectionCard eyebrow="Login kurallari" title="Ekran algilama ve otomatik login ayarlari">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-200">Login ekran anahtar kelimeleri</span>
              <input
                value={draft.automationRules.loginWindowKeywords.join(", ")}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          automationRules: {
                            ...current.automationRules,
                            loginWindowKeywords: parseKeywordInput(event.target.value),
                          },
                        }
                      : current,
                  )
                }
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                placeholder="login, giris, sign in"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-200">Basarili ekran anahtar kelimeleri</span>
              <input
                value={draft.automationRules.successWindowKeywords.join(", ")}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          automationRules: {
                            ...current.automationRules,
                            successWindowKeywords: parseKeywordInput(event.target.value),
                          },
                        }
                      : current,
                  )
                }
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                placeholder="hesaplarim, dashboard"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-200">Email alan ipuclari</span>
              <input
                value={draft.automationRules.emailFieldHints.join(", ")}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          automationRules: {
                            ...current.automationRules,
                            emailFieldHints: parseKeywordInput(event.target.value),
                          },
                        }
                      : current,
                  )
                }
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-200">Sifre alan ipuclari</span>
              <input
                value={draft.automationRules.passwordFieldHints.join(", ")}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          automationRules: {
                            ...current.automationRules,
                            passwordFieldHints: parseKeywordInput(event.target.value),
                          },
                        }
                      : current,
                  )
                }
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-200">Login buton ipuclari</span>
              <input
                value={draft.automationRules.submitButtonHints.join(", ")}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          automationRules: {
                            ...current.automationRules,
                            submitButtonHints: parseKeywordInput(event.target.value),
                          },
                        }
                      : current,
                  )
                }
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-200">Relaunch bekleme (sn)</span>
              <input
                type="number"
                min={1}
                max={30}
                value={draft.automationRules.relaunchWaitSec}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          automationRules: {
                            ...current.automationRules,
                            relaunchWaitSec: Number(event.target.value) || 1,
                          },
                        }
                      : current,
                  )
                }
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-200">Login sonrasi bekleme (sn)</span>
              <input
                type="number"
                min={1}
                max={30}
                value={draft.automationRules.postLoginWaitSec}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          automationRules: {
                            ...current.automationRules,
                            postLoginWaitSec: Number(event.target.value) || 1,
                          },
                        }
                      : current,
                  )
                }
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
              />
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-slate-950/50 px-4 py-4 md:col-span-2">
              <input
                type="checkbox"
                checked={draft.automationRules.autoLoginEnabled}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          automationRules: {
                            ...current.automationRules,
                            autoLoginEnabled: event.target.checked,
                          },
                        }
                      : current,
                  )
                }
                className="h-4 w-4 rounded border-white/20 bg-slate-900"
              />
              <div>
                <div className="text-sm font-medium text-white">Otomatik login acik</div>
                <div className="text-xs text-slate-400">
                  Login ekran anahtar kelimeleri algilanirsa worker pywinauto ile email ve sifre girisi dener.
                </div>
              </div>
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-slate-950/50 px-4 py-4 md:col-span-2">
              <input
                type="checkbox"
                checked={draft.automationRules.preLoginHotkeyEnabled}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          automationRules: {
                            ...current.automationRules,
                            preLoginHotkeyEnabled: event.target.checked,
                          },
                        }
                      : current,
                  )
                }
                className="h-4 w-4 rounded border-white/20 bg-slate-900"
              />
              <div>
                <div className="text-sm font-medium text-white">Login oncesi hotkey tetikle</div>
                <div className="text-xs text-slate-400">
                  Logout olunca once belirledigin kisayol tusuna basilir, sonra login akisi baslar.
                </div>
              </div>
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-200">Login oncesi hotkey</span>
              <input
                value={draft.automationRules.preLoginHotkey}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          automationRules: {
                            ...current.automationRules,
                            preLoginHotkey: event.target.value,
                          },
                        }
                      : current,
                  )
                }
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                placeholder="CTRL+ALT+L veya F5"
              />
            </label>
          </div>
        </SectionCard>

        <SectionCard eyebrow="Ek otomasyon" title="Yardimci program ve tiklama tuslama kurallari">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-slate-950/50 px-4 py-4 md:col-span-2">
              <input
                type="checkbox"
                checked={draft.automationRules.helperAutomation.enabled}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          automationRules: {
                            ...current.automationRules,
                            helperAutomation: {
                              ...current.automationRules.helperAutomation,
                              enabled: event.target.checked,
                            },
                          },
                        }
                      : current,
                  )
                }
                className="h-4 w-4 rounded border-white/20 bg-slate-900"
              />
              <div>
                <div className="text-sm font-medium text-white">Yardimci otomasyon aktif</div>
                <div className="text-xs text-slate-400">
                  Ikinci bir program acilip istersen hotkey, istersen koordinat tiklamasi uygulanir.
                </div>
              </div>
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-200">Program yolu</span>
              <input
                value={draft.automationRules.helperAutomation.programPath}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          automationRules: {
                            ...current.automationRules,
                            helperAutomation: {
                              ...current.automationRules.helperAutomation,
                              programPath: event.target.value,
                            },
                          },
                        }
                      : current,
                  )
                }
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                placeholder="C:\\Program Files\\Helper\\helper.exe"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-200">Program argumanlari</span>
              <input
                value={draft.automationRules.helperAutomation.launchArgs.join(" ")}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          automationRules: {
                            ...current.automationRules,
                            helperAutomation: {
                              ...current.automationRules.helperAutomation,
                              launchArgs: event.target.value.trim() ? event.target.value.trim().split(/\s+/) : [],
                            },
                          },
                        }
                      : current,
                  )
                }
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                placeholder="--profile market --mode quick"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-200">Tetikleme turu</span>
              <select
                value={draft.automationRules.helperAutomation.trigger}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          automationRules: {
                            ...current.automationRules,
                            helperAutomation: {
                              ...current.automationRules.helperAutomation,
                              trigger: event.target.value as "none" | "hotkey" | "click",
                            },
                          },
                        }
                      : current,
                  )
                }
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
              >
                <option value="none">Sadece ac</option>
                <option value="hotkey">Hotkey gonder</option>
                <option value="click">Koordinata tikla</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-200">Acilis sonrasi bekleme (sn)</span>
              <input
                type="number"
                min={0}
                max={60}
                value={draft.automationRules.helperAutomation.waitAfterLaunchSec}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          automationRules: {
                            ...current.automationRules,
                            helperAutomation: {
                              ...current.automationRules.helperAutomation,
                              waitAfterLaunchSec: Number(event.target.value) || 0,
                            },
                          },
                        }
                      : current,
                  )
                }
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-200">Yardimci program hotkey</span>
              <input
                value={draft.automationRules.helperAutomation.hotkey}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          automationRules: {
                            ...current.automationRules,
                            helperAutomation: {
                              ...current.automationRules.helperAutomation,
                              hotkey: event.target.value,
                            },
                          },
                        }
                      : current,
                  )
                }
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                placeholder="CTRL+SHIFT+R"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-200">Tiklama X</span>
              <input
                type="number"
                value={draft.automationRules.helperAutomation.clickX}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          automationRules: {
                            ...current.automationRules,
                            helperAutomation: {
                              ...current.automationRules.helperAutomation,
                              clickX: Number(event.target.value) || 0,
                            },
                          },
                        }
                      : current,
                  )
                }
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-200">Tiklama Y</span>
              <input
                type="number"
                value={draft.automationRules.helperAutomation.clickY}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          automationRules: {
                            ...current.automationRules,
                            helperAutomation: {
                              ...current.automationRules.helperAutomation,
                              clickY: Number(event.target.value) || 0,
                            },
                          },
                        }
                      : current,
                  )
                }
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-200">Tiklama dugmesi</span>
              <select
                value={draft.automationRules.helperAutomation.clickButton}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          automationRules: {
                            ...current.automationRules,
                            helperAutomation: {
                              ...current.automationRules.helperAutomation,
                              clickButton: event.target.value as "left" | "right",
                            },
                          },
                        }
                      : current,
                  )
                }
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
              >
                <option value="left">Sol tik</option>
                <option value="right">Sag tik</option>
              </select>
            </label>
          </div>
        </SectionCard>

        <SectionCard eyebrow="Pencere profilleri" title="Login sonrasi secim ve konum kurallari">
          {isLoadingDeviceDetail ? (
            <div className="text-sm text-slate-400">Cihaz detaylari yukleniyor...</div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {draft.profiles.map((profile) => (
                <div key={profile.id} className="rounded-[24px] border border-white/8 bg-slate-950/50 p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Pencere {profile.slot}</div>
                    <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                      {formatPosition(profile.position)}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <input
                      value={profile.email}
                      onChange={(event) => updateProfile(profile.slot, "email", event.target.value)}
                      className="h-11 rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                      placeholder="hesap@example.com"
                    />
                    <input
                      value={profile.credentialId}
                      onChange={(event) => updateProfile(profile.slot, "credentialId", event.target.value)}
                      className="h-11 rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                      placeholder="cred-hesap-a"
                    />
                    <input
                      value={profile.postLoginChoice ?? ""}
                      onChange={(event) => updateProfile(profile.slot, "postLoginChoice", event.target.value)}
                      className="h-11 rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                      placeholder="Secenek A"
                    />
                    <select
                      value={profile.position}
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                profiles: current.profiles.map((item) =>
                                  item.slot === profile.slot
                                    ? { ...item, position: event.target.value as WindowProfile["position"] }
                                    : item,
                                ),
                              }
                            : current,
                        )
                      }
                      className="h-11 rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none transition focus:border-sky-400/40"
                    >
                      <option value="top_left">Sol ust</option>
                      <option value="top_right">Sag ust</option>
                      <option value="bottom_left">Sol alt</option>
                      <option value="bottom_right">Sag alt</option>
                    </select>
                  </div>
                  <div className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">
                    Son durum: {profile.lastAction}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </LayoutShell>
  );
}
