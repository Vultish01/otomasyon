export type AutomationState =
  | "idle"
  | "checking"
  | "relaunching"
  | "logging_in"
  | "positioning"
  | "error";

export type WindowPosition =
  | "top_left"
  | "top_right"
  | "bottom_left"
  | "bottom_right";

export type WindowProfile = {
  id: string;
  deviceId: string;
  slot: 1 | 2 | 3 | 4;
  email: string;
  credentialId: string;
  postLoginChoice?: string;
  position: WindowPosition;
  lastAction: string;
};

export type DeviceStatus = {
  id: string;
  name: string;
  osVersion: string;
  online: boolean;
  internetReachable: boolean;
  lastHeartbeatAt: string;
  automationState: AutomationState;
  lastError?: string;
  activeWindows: number;
  exePath: string;
  retriesToday: number;
};

export type DeviceEvent = {
  id: string;
  deviceId: string;
  level: "info" | "warning" | "error" | "success";
  eventType: string;
  message: string;
  createdAt: string;
};

export type DeviceCommand =
  | "relogin"
  | "restart_all"
  | "reposition"
  | "start_exe";

export type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  target: string;
  createdAt: string;
};

export type DeviceConfig = {
  deviceId: string;
  exePath: string;
  launchArgs: string[];
  windowCount: number;
  healthCheckIntervalSec: number;
  reconnectCooldownSec: number;
  profiles: WindowProfile[];
};

export type DeviceRegistrationRequest = {
  name: string;
  osVersion: string;
  exePath: string;
  windowCount: number;
  healthCheckIntervalSec: number;
  reconnectCooldownSec: number;
  launchArgs: string[];
};

export type WorkerConfigPayload = {
  apiBaseUrl: string;
  deviceId: string;
  healthCheckIntervalSec: number;
  reconnectCooldownSec: number;
  exePath: string;
  launchArgs: string[];
};
