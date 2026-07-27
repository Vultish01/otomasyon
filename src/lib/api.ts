import type {
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
  profiles: ApiWindowProfile[];
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
  health_check_interval_sec: number;
  reconnect_cooldown_sec: number;
  exe_path: string;
  launch_args: string[];
};

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
    profiles: item.profiles.map(mapProfile),
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
    healthCheckIntervalSec: item.health_check_interval_sec,
    reconnectCooldownSec: item.reconnect_cooldown_sec,
    exePath: item.exe_path,
    launchArgs: item.launch_args,
  };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`API istegi basarisiz: ${response.status}`);
  }

  return response.json() as Promise<T>;
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
    command === "restart_all" ? "restart-all" : command;

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
