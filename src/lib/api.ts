import type {
  AuthResponse,
  AuthUser,
  AutomationRules,
  DeviceConfig,
  DeviceEvent,
  DeviceRegistrationRequest,
  DeviceStatus,
  WindowProfile,
  WorkerConfigPayload,
} from "@shared/types";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

type ApiDeviceStatus = {
  id: string;
  name: string;
  os_version: string;
  online: boolean;
  internet_reachable: boolean;
  last_heartbeat_at: string;
  automation_state: DeviceStatus["automationState"];
  last_error?: string;
  active_windows: number;
  exe_path: string;
  retries_today: number;
};

type ApiWindowProfile = {
  id: string;
  device_id: string;
  slot: 1 | 2 | 3 | 4;
  email: string;
  credential_id: string;
  post_login_choice?: string;
  position: WindowProfile["position"];
  last_action: string;
};

type ApiDeviceConfig = {
  device_id: string;
  exe_path: string;
  launch_args: string[];
  window_count: number;
  health_check_interval_sec: number;
  reconnect_cooldown_sec: number;
  automation_rules?: {
    auto_login_enabled: boolean;
    login_window_keywords: string[];
    success_window_keywords: string[];
    email_field_hints: string[];
    password_field_hints: string[];
    submit_button_hints: string[];
    relaunch_wait_sec: number;
    post_login_wait_sec: number;
    pre_login_hotkey_enabled?: boolean;
    pre_login_hotkey?: string;
    helper_automation?: {
      enabled: boolean;
      program_path: string;
      launch_args: string[];
      trigger: "none" | "hotkey" | "click";
      hotkey: string;
      click_x: number;
      click_y: number;
      click_button: "left" | "right";
      wait_after_launch_sec: number;
    };
  };
  profiles?: ApiWindowProfile[];
};

type ApiDeviceEvent = {
  id: string;
  device_id: string;
  level: DeviceEvent["level"];
  event_type: string;
  message: string;
  created_at: string;
};

type ApiWorkerConfigPayload = {
  api_base_url: string;
  device_id: string;
  machine_key?: string;
  window_count: number;
  health_check_interval_sec: number;
  reconnect_cooldown_sec: number;
  exe_path: string;
  launch_args: string[];
  automation_rules?: ApiDeviceConfig["automation_rules"];
  profiles?: ApiWindowProfile[];
};

type ApiAuthUser = {
  id: string;
  name: string;
  email: string;
  created_at: string;
};

type ApiAuthResponse = {
  user: ApiAuthUser;
  session_token: string;
};

const sessionStorageKey = "otologin.session_token";

const defaultAutomationRules: AutomationRules = {
  autoLoginEnabled: true,
  loginWindowKeywords: ["login", "giris", "sign in", "e-posta", "sifre"],
  successWindowKeywords: [],
  emailFieldHints: ["email", "e-posta", "kullanici"],
  passwordFieldHints: ["sifre", "password"],
  submitButtonHints: ["giris", "login", "sign in", "devam"],
  relaunchWaitSec: 4,
  postLoginWaitSec: 3,
  preLoginHotkeyEnabled: false,
  preLoginHotkey: "",
  helperAutomation: {
    enabled: false,
    programPath: "",
    launchArgs: [],
    trigger: "none",
    hotkey: "",
    clickX: 0,
    clickY: 0,
    clickButton: "left",
    waitAfterLaunchSec: 2,
  },
};

function mapAutomationRules(item?: ApiDeviceConfig["automation_rules"]): AutomationRules {
  if (!item) {
    return defaultAutomationRules;
  }
  return {
    autoLoginEnabled: item.auto_login_enabled,
    loginWindowKeywords: item.login_window_keywords,
    successWindowKeywords: item.success_window_keywords,
    emailFieldHints: item.email_field_hints,
    passwordFieldHints: item.password_field_hints,
    submitButtonHints: item.submit_button_hints,
    relaunchWaitSec: item.relaunch_wait_sec,
    postLoginWaitSec: item.post_login_wait_sec,
    preLoginHotkeyEnabled: item.pre_login_hotkey_enabled ?? false,
    preLoginHotkey: item.pre_login_hotkey ?? "",
    helperAutomation: {
      enabled: item.helper_automation?.enabled ?? false,
      programPath: item.helper_automation?.program_path ?? "",
      launchArgs: item.helper_automation?.launch_args ?? [],
      trigger: item.helper_automation?.trigger ?? "none",
      hotkey: item.helper_automation?.hotkey ?? "",
      clickX: item.helper_automation?.click_x ?? 0,
      clickY: item.helper_automation?.click_y ?? 0,
      clickButton: item.helper_automation?.click_button ?? "left",
      waitAfterLaunchSec: item.helper_automation?.wait_after_launch_sec ?? 2,
    },
  };
}

function mapAuthUser(item: ApiAuthUser): AuthUser {
  return {
    id: item.id,
    name: item.name,
    email: item.email,
    createdAt: item.created_at,
  };
}

function mapAuthResponse(item: ApiAuthResponse): AuthResponse {
  return {
    user: mapAuthUser(item.user),
    sessionToken: item.session_token,
  };
}

export function getSessionToken() {
  return typeof window === "undefined" ? null : window.localStorage.getItem(sessionStorageKey);
}

export function setSessionToken(token: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(sessionStorageKey, token);
  }
}

export function clearSessionToken() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(sessionStorageKey);
  }
}

function mapDeviceStatus(item: ApiDeviceStatus): DeviceStatus {
  return {
    id: item.id,
    name: item.name,
    osVersion: item.os_version,
    online: item.online,
    internetReachable: item.internet_reachable,
    lastHeartbeatAt: item.last_heartbeat_at,
    automationState: item.automation_state,
    lastError: item.last_error,
    activeWindows: item.active_windows,
    exePath: item.exe_path,
    retriesToday: item.retries_today,
  };
}

function mapProfile(item: ApiWindowProfile): WindowProfile {
  return {
    id: item.id,
    deviceId: item.device_id,
    slot: item.slot,
    email: item.email,
    credentialId: item.credential_id,
    postLoginChoice: item.post_login_choice,
    position: item.position,
    lastAction: item.last_action,
  };
}

function mapDeviceConfig(item: ApiDeviceConfig): DeviceConfig {
  return {
    deviceId: item.device_id,
    exePath: item.exe_path,
    launchArgs: item.launch_args,
    windowCount: item.window_count,
    healthCheckIntervalSec: item.health_check_interval_sec,
    reconnectCooldownSec: item.reconnect_cooldown_sec,
    automationRules: mapAutomationRules(item.automation_rules),
    profiles: (item.profiles ?? []).map(mapProfile),
  };
}

function mapEvent(item: ApiDeviceEvent): DeviceEvent {
  return {
    id: item.id,
    deviceId: item.device_id,
    level: item.level,
    eventType: item.event_type,
    message: item.message,
    createdAt: item.created_at,
  };
}

function mapWorkerConfig(item: ApiWorkerConfigPayload): WorkerConfigPayload {
  return {
    apiBaseUrl: item.api_base_url,
    deviceId: item.device_id,
    machineKey: item.machine_key,
    windowCount: item.window_count,
    healthCheckIntervalSec: item.health_check_interval_sec,
    reconnectCooldownSec: item.reconnect_cooldown_sec,
    exePath: item.exe_path,
    launchArgs: item.launch_args,
    automationRules: mapAutomationRules(item.automation_rules),
    profiles: (item.profiles ?? []).map(mapProfile),
  };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const sessionToken = getSessionToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(sessionToken ? { "X-Session-Token": sessionToken } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    let detail = `API istegi basarisiz: ${response.status}`;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) {
        detail = payload.detail;
      }
    } catch {
      // ignore non-JSON error payloads
    }
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export async function fetchAuthBootstrap() {
  return apiFetch<{ registration_enabled: boolean; user_count: number }>("/api/auth/bootstrap");
}

export async function registerPanelUser(payload: { name: string; email: string; password: string }) {
  const response = await apiFetch<ApiAuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapAuthResponse(response);
}

export async function loginPanelUser(payload: { email: string; password: string }) {
  const response = await apiFetch<ApiAuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapAuthResponse(response);
}

export async function fetchCurrentUser() {
  const response = await apiFetch<ApiAuthUser>("/api/auth/me");
  return mapAuthUser(response);
}

export async function logoutPanelUser() {
  return apiFetch<{ status: string }>("/api/auth/logout", {
    method: "POST",
  });
}

export async function fetchDevices() {
  const payload = await apiFetch<ApiDeviceStatus[]>("/api/devices");
  return payload.map(mapDeviceStatus);
}

export async function fetchDeviceDetail(deviceId: string) {
  const payload = await apiFetch<{ device: ApiDeviceStatus; config: ApiDeviceConfig }>(
    `/api/devices/${deviceId}`,
  );
  return {
    device: mapDeviceStatus(payload.device),
    config: mapDeviceConfig(payload.config),
  };
}

export async function fetchLogs() {
  const payload = await apiFetch<{ events: ApiDeviceEvent[] }>("/api/logs");
  return payload.events.map(mapEvent);
}

export async function updateDeviceConfig(config: DeviceConfig) {
  return apiFetch<{ status: string }>(`/api/devices/${config.deviceId}/config`, {
    method: "PUT",
    body: JSON.stringify({
      device_id: config.deviceId,
      exe_path: config.exePath,
      launch_args: config.launchArgs,
      window_count: config.windowCount,
      health_check_interval_sec: config.healthCheckIntervalSec,
      reconnect_cooldown_sec: config.reconnectCooldownSec,
      automation_rules: {
        auto_login_enabled: config.automationRules.autoLoginEnabled,
        login_window_keywords: config.automationRules.loginWindowKeywords,
        success_window_keywords: config.automationRules.successWindowKeywords,
        email_field_hints: config.automationRules.emailFieldHints,
        password_field_hints: config.automationRules.passwordFieldHints,
        submit_button_hints: config.automationRules.submitButtonHints,
        relaunch_wait_sec: config.automationRules.relaunchWaitSec,
        post_login_wait_sec: config.automationRules.postLoginWaitSec,
        pre_login_hotkey_enabled: config.automationRules.preLoginHotkeyEnabled,
        pre_login_hotkey: config.automationRules.preLoginHotkey,
        helper_automation: {
          enabled: config.automationRules.helperAutomation.enabled,
          program_path: config.automationRules.helperAutomation.programPath,
          launch_args: config.automationRules.helperAutomation.launchArgs,
          trigger: config.automationRules.helperAutomation.trigger,
          hotkey: config.automationRules.helperAutomation.hotkey,
          click_x: config.automationRules.helperAutomation.clickX,
          click_y: config.automationRules.helperAutomation.clickY,
          click_button: config.automationRules.helperAutomation.clickButton,
          wait_after_launch_sec: config.automationRules.helperAutomation.waitAfterLaunchSec,
        },
      },
      profiles: config.profiles.map((profile) => ({
        id: profile.id,
        device_id: profile.deviceId,
        slot: profile.slot,
        email: profile.email,
        credential_id: profile.credentialId,
        post_login_choice: profile.postLoginChoice,
        position: profile.position,
        last_action: profile.lastAction,
      })),
    }),
  });
}

export async function postCommand(deviceId: string, command: string) {
  const endpoint =
    command === "restart_all" ? "restart-all" : command === "run_helper" ? "run-helper" : command;

  return apiFetch<{ command_id: string; status: string }>(`/api/devices/${deviceId}/commands/${endpoint}`, {
    method: "POST",
    body: JSON.stringify({ payload: {} }),
  });
}

export async function registerDevice(payload: DeviceRegistrationRequest) {
  const response = await apiFetch<{
    device: ApiDeviceStatus;
    config: ApiDeviceConfig;
    worker_config: ApiWorkerConfigPayload;
  }>("/api/devices/register", {
    method: "POST",
    body: JSON.stringify({
      name: payload.name,
      machine_key: payload.machineKey,
      os_version: payload.osVersion,
      exe_path: payload.exePath,
      window_count: payload.windowCount,
      health_check_interval_sec: payload.healthCheckIntervalSec,
      reconnect_cooldown_sec: payload.reconnectCooldownSec,
      launch_args: payload.launchArgs,
    }),
  });

  return {
    device: mapDeviceStatus(response.device),
    config: mapDeviceConfig(response.config),
    workerConfig: mapWorkerConfig(response.worker_config),
  };
}

export async function fetchWorkerConfig(deviceId: string) {
  const payload = await apiFetch<ApiWorkerConfigPayload>(`/api/devices/${deviceId}/worker-config`);
  return mapWorkerConfig(payload);
}
