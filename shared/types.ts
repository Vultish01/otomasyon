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

export type HelperTriggerType = "none" | "hotkey" | "click" | "image";
export type MouseButtonType = "left" | "right";

export type HelperAutomation = {
  enabled: boolean;
  programPath: string;
  launchArgs: string[];
  trigger: HelperTriggerType;
  hotkey: string;
  clickX: number;
  clickY: number;
  clickButton: MouseButtonType;
  clickImagePath: string;
  clickImageConfidence: number;
  waitAfterLaunchSec: number;
};

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

export type AutomationRules = {
  autoLoginEnabled: boolean;
  loginWindowKeywords: string[];
  successWindowKeywords: string[];
  emailFieldHints: string[];
  passwordFieldHints: string[];
  submitButtonHints: string[];
  relaunchWaitSec: number;
  postLoginWaitSec: number;
  preLoginHotkeyEnabled: boolean;
  preLoginHotkey: string;
  helperAutomation: HelperAutomation;
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
  | "start_exe"
  | "run_helper";

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
  automationRules: AutomationRules;
  profiles: WindowProfile[];
};

export type DeviceRegistrationRequest = {
  machineKey?: string;
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
  machineKey?: string;
  workerToken?: string;
  windowCount: number;
  healthCheckIntervalSec: number;
  reconnectCooldownSec: number;
  exePath: string;
  launchArgs: string[];
  automationRules: AutomationRules;
  profiles: WindowProfile[];
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export type AuthResponse = {
  user: AuthUser;
  sessionToken: string;
};
