import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useControlCenterStore } from "@/store/useControlCenterStore";

const automationRules = {
  autoLoginEnabled: true,
  loginWindowKeywords: ["login", "giris"],
  successWindowKeywords: ["dashboard"],
  emailFieldHints: ["email"],
  passwordFieldHints: ["sifre"],
  submitButtonHints: ["giris"],
  relaunchWaitSec: 4,
  postLoginWaitSec: 3,
  preLoginHotkeyEnabled: false,
  preLoginHotkey: "",
  helperAutomation: {
    enabled: false,
    programPath: "",
    launchArgs: [],
    trigger: "none" as const,
    hotkey: "",
    clickX: 0,
    clickY: 0,
    clickButton: "left" as const,
    clickImagePath: "",
    clickImageConfidence: 0.8,
    waitAfterLaunchSec: 2,
  },
};

function mockJsonResponse(payload: unknown) {
  return Promise.resolve({
    ok: true,
    json: async () => payload,
  } as Response);
}

describe("useControlCenterStore", () => {
  beforeEach(() => {
    useControlCenterStore.setState(useControlCenterStore.getInitialState(), true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("yeni cihaz kaydinda cihaz ve worker config bilgisini saklar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        mockJsonResponse({
          device: {
            id: "yeni-pc-123abc",
            name: "Yeni PC",
            os_version: "Windows 11 Pro",
            online: false,
            internet_reachable: false,
            last_heartbeat_at: "2026-07-27T12:00:00Z",
            automation_state: "idle",
            active_windows: 0,
            exe_path: "C:\\App\\broker.exe",
            retries_today: 0,
          },
          config: {
            device_id: "yeni-pc-123abc",
            exe_path: "C:\\App\\broker.exe",
            launch_args: [],
            window_count: 4,
            health_check_interval_sec: 5,
            reconnect_cooldown_sec: 15,
            automation_rules: {
              auto_login_enabled: true,
              login_window_keywords: ["login", "giris"],
              success_window_keywords: ["dashboard"],
              email_field_hints: ["email"],
              password_field_hints: ["sifre"],
              submit_button_hints: ["giris"],
              relaunch_wait_sec: 4,
              post_login_wait_sec: 3,
              pre_login_hotkey_enabled: false,
              pre_login_hotkey: "",
              helper_automation: {
                enabled: false,
                program_path: "",
                launch_args: [],
                trigger: "none",
                hotkey: "",
                click_x: 0,
                click_y: 0,
                click_button: "left",
                wait_after_launch_sec: 2,
              },
            },
            profiles: [],
          },
          worker_config: {
            api_base_url: "https://otologin-api.onrender.com",
            device_id: "yeni-pc-123abc",
            machine_key: "machine-yeni-pc",
            window_count: 4,
            health_check_interval_sec: 5,
            reconnect_cooldown_sec: 15,
            exe_path: "C:\\App\\broker.exe",
            launch_args: [],
            automation_rules: {
              auto_login_enabled: true,
              login_window_keywords: ["login", "giris"],
              success_window_keywords: ["dashboard"],
              email_field_hints: ["email"],
              password_field_hints: ["sifre"],
              submit_button_hints: ["giris"],
              relaunch_wait_sec: 4,
              post_login_wait_sec: 3,
              pre_login_hotkey_enabled: false,
              pre_login_hotkey: "",
              helper_automation: {
                enabled: false,
                program_path: "",
                launch_args: [],
                trigger: "none",
                hotkey: "",
                click_x: 0,
                click_y: 0,
                click_button: "left",
                wait_after_launch_sec: 2,
              },
            },
            profiles: [],
          },
        }),
      ),
    );

    const deviceId = await useControlCenterStore.getState().registerNewDevice({
      name: "Yeni PC",
      osVersion: "Windows 11 Pro",
      exePath: "C:\\App\\broker.exe",
      windowCount: 4,
      healthCheckIntervalSec: 5,
      reconnectCooldownSec: 15,
      launchArgs: [],
    });

    expect(deviceId).toBe("yeni-pc-123abc");
    expect(useControlCenterStore.getState().configs[deviceId]?.exePath).toBe("C:\\App\\broker.exe");
    expect(useControlCenterStore.getState().workerConfigByDeviceId[deviceId]?.apiBaseUrl).toBe(
      "https://otologin-api.onrender.com",
    );
    expect(useControlCenterStore.getState().workerConfigByDeviceId[deviceId]?.windowCount).toBe(4);
  });

  it("konfigrasyon kaydinda config durumunu yeniler", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockImplementationOnce(() => mockJsonResponse({ status: "updated" }))
        .mockImplementationOnce(() =>
          mockJsonResponse({
            device: {
              id: "win-floor-01",
              name: "Borsa PC 01",
              os_version: "Windows 11 Pro",
              online: true,
              internet_reachable: true,
              last_heartbeat_at: "2026-07-27T12:00:00Z",
              automation_state: "idle",
              active_windows: 4,
              exe_path: "E:\\Yeni\\broker.exe",
              retries_today: 1,
            },
            config: {
              device_id: "win-floor-01",
              exe_path: "E:\\Yeni\\broker.exe",
              launch_args: ["--legacy-render"],
              window_count: 3,
              health_check_interval_sec: 8,
              reconnect_cooldown_sec: 20,
              automation_rules: {
                auto_login_enabled: true,
                login_window_keywords: ["login", "giris"],
                success_window_keywords: ["dashboard"],
                email_field_hints: ["email"],
                password_field_hints: ["sifre"],
                submit_button_hints: ["giris"],
                relaunch_wait_sec: 4,
                post_login_wait_sec: 3,
                pre_login_hotkey_enabled: false,
                pre_login_hotkey: "",
                helper_automation: {
                  enabled: false,
                  program_path: "",
                  launch_args: [],
                  trigger: "none",
                  hotkey: "",
                  click_x: 0,
                  click_y: 0,
                  click_button: "left",
                  wait_after_launch_sec: 2,
                },
              },
              profiles: [],
            },
          }),
        )
        .mockImplementationOnce(() =>
          mockJsonResponse({
            api_base_url: "https://otologin-api.onrender.com",
            device_id: "win-floor-01",
            machine_key: "machine-win-floor-01",
            window_count: 3,
            health_check_interval_sec: 8,
            reconnect_cooldown_sec: 20,
            exe_path: "E:\\Yeni\\broker.exe",
            launch_args: ["--legacy-render"],
            automation_rules: {
              auto_login_enabled: true,
              login_window_keywords: ["login", "giris"],
              success_window_keywords: ["dashboard"],
              email_field_hints: ["email"],
              password_field_hints: ["sifre"],
              submit_button_hints: ["giris"],
              relaunch_wait_sec: 4,
              post_login_wait_sec: 3,
              pre_login_hotkey_enabled: false,
              pre_login_hotkey: "",
              helper_automation: {
                enabled: false,
                program_path: "",
                launch_args: [],
                trigger: "none",
                hotkey: "",
                click_x: 0,
                click_y: 0,
                click_button: "left",
                wait_after_launch_sec: 2,
              },
            },
            profiles: [],
          }),
        ),
    );

    await useControlCenterStore.getState().saveDeviceConfig({
      deviceId: "win-floor-01",
      exePath: "E:\\Yeni\\broker.exe",
      launchArgs: ["--legacy-render"],
      windowCount: 3,
      healthCheckIntervalSec: 8,
      reconnectCooldownSec: 20,
      automationRules,
      profiles: [],
    });

    expect(useControlCenterStore.getState().configs["win-floor-01"].windowCount).toBe(3);
    expect(useControlCenterStore.getState().devices.find((item: { id: string; exePath: string }) => item.id === "win-floor-01")?.exePath).toBe(
      "E:\\Yeni\\broker.exe",
    );
  });
});
