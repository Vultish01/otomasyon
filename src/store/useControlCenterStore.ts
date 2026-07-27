import { create } from "zustand";
import type {
  AuditEntry,
  DeviceCommand,
  DeviceConfig,
  DeviceEvent,
  DeviceStatus,
} from "@shared/types";

type ControlCenterState = {
  devices: DeviceStatus[];
  configs: Record<string, DeviceConfig>;
  events: DeviceEvent[];
  auditTrail: AuditEntry[];
  selectedDeviceId: string;
  setSelectedDeviceId: (deviceId: string) => void;
  runCommand: (deviceId: string, command: DeviceCommand) => void;
  runBulkRelogin: () => void;
  saveExePath: (deviceId: string, exePath: string) => void;
};

const now = "2026-07-27T02:50:00.000Z";

const seededDevices: DeviceStatus[] = [
  {
    id: "win-floor-01",
    name: "Borsa PC 01",
    osVersion: "Windows 11 Pro",
    online: true,
    internetReachable: true,
    lastHeartbeatAt: now,
    automationState: "idle",
    activeWindows: 4,
    exePath: "C:\\Apps\\BrokerDesk\\broker.exe",
    retriesToday: 1,
  },
  {
    id: "win-floor-02",
    name: "Borsa PC 02",
    osVersion: "Windows 10 Pro",
    online: true,
    internetReachable: false,
    lastHeartbeatAt: "2026-07-27T02:47:00.000Z",
    automationState: "checking",
    activeWindows: 2,
    exePath: "D:\\Trading\\broker.exe",
    retriesToday: 4,
    lastError: "Internet geri gelmedi, worker beklemede.",
  },
  {
    id: "win-floor-03",
    name: "Borsa PC 03",
    osVersion: "Windows 10 Home",
    online: true,
    internetReachable: true,
    lastHeartbeatAt: "2026-07-27T02:49:10.000Z",
    automationState: "logging_in",
    activeWindows: 3,
    exePath: "C:\\Legacy\\broker.exe",
    retriesToday: 2,
  },
];

const seededConfigs: Record<string, DeviceConfig> = {
  "win-floor-01": {
    deviceId: "win-floor-01",
    exePath: "C:\\Apps\\BrokerDesk\\broker.exe",
    launchArgs: [],
    windowCount: 4,
    healthCheckIntervalSec: 5,
    reconnectCooldownSec: 15,
    profiles: [
      {
        id: "wf01-p1",
        deviceId: "win-floor-01",
        slot: 1,
        email: "hesap-a@example.com",
        credentialId: "cred-hesap-a",
        postLoginChoice: "Secenek A",
        position: "top_left",
        lastAction: "Basarili login",
      },
      {
        id: "wf01-p2",
        deviceId: "win-floor-01",
        slot: 2,
        email: "hesap-a@example.com",
        credentialId: "cred-hesap-a",
        postLoginChoice: "Secenek B",
        position: "top_right",
        lastAction: "Secim ekrani dogrulandi",
      },
      {
        id: "wf01-p3",
        deviceId: "win-floor-01",
        slot: 3,
        email: "hesap-b@example.com",
        credentialId: "cred-hesap-b",
        postLoginChoice: "Secenek A",
        position: "bottom_left",
        lastAction: "Pencere hizalandi",
      },
      {
        id: "wf01-p4",
        deviceId: "win-floor-01",
        slot: 4,
        email: "hesap-b@example.com",
        credentialId: "cred-hesap-b",
        postLoginChoice: "Secenek B",
        position: "bottom_right",
        lastAction: "Beklemede",
      },
    ],
  },
  "win-floor-02": {
    deviceId: "win-floor-02",
    exePath: "D:\\Trading\\broker.exe",
    launchArgs: [],
    windowCount: 4,
    healthCheckIntervalSec: 10,
    reconnectCooldownSec: 25,
    profiles: [],
  },
  "win-floor-03": {
    deviceId: "win-floor-03",
    exePath: "C:\\Legacy\\broker.exe",
    launchArgs: ["--legacy-render"],
    windowCount: 4,
    healthCheckIntervalSec: 8,
    reconnectCooldownSec: 20,
    profiles: [],
  },
};

const seededEvents: DeviceEvent[] = [
  {
    id: "evt-1",
    deviceId: "win-floor-03",
    level: "warning",
    eventType: "logout_detected",
    message: "Pencere 3 ana ekran yerine login ekranina dustu.",
    createdAt: "2026-07-27T02:48:04.000Z",
  },
  {
    id: "evt-2",
    deviceId: "win-floor-03",
    level: "info",
    eventType: "restart_started",
    message: "Eski pencere kapatildi, EXE yeniden baslatildi.",
    createdAt: "2026-07-27T02:48:40.000Z",
  },
  {
    id: "evt-3",
    deviceId: "win-floor-02",
    level: "error",
    eventType: "connectivity_lost",
    message: "Internet kontrolu basarisiz. Cooldown suresi icinde yeniden deneme yapilmayacak.",
    createdAt: "2026-07-27T02:47:10.000Z",
  },
  {
    id: "evt-4",
    deviceId: "win-floor-01",
    level: "success",
    eventType: "quadrant_positioned",
    message: "Tum 4 pencere hedef ceyreklerde dogrulandi.",
    createdAt: "2026-07-27T02:45:21.000Z",
  },
];

const seededAudit: AuditEntry[] = [
  {
    id: "audit-1",
    actor: "moe@control.local",
    action: "Toplu relogin",
    target: "Tum cihazlar",
    createdAt: "2026-07-27T02:20:00.000Z",
  },
  {
    id: "audit-2",
    actor: "worker/win-floor-03",
    action: "Otomatik relogin",
    target: "Pencere 3",
    createdAt: "2026-07-27T02:48:45.000Z",
  },
];

function commandState(command: DeviceCommand): DeviceStatus["automationState"] {
  switch (command) {
    case "relogin":
      return "logging_in";
    case "restart_all":
      return "relaunching";
    case "reposition":
      return "positioning";
    case "start_exe":
      return "checking";
    default:
      return "idle";
  }
}

export const useControlCenterStore = create<ControlCenterState>((set) => ({
  devices: seededDevices,
  configs: seededConfigs,
  events: seededEvents,
  auditTrail: seededAudit,
  selectedDeviceId: "win-floor-01",
  setSelectedDeviceId: (deviceId) => set({ selectedDeviceId: deviceId }),
  runCommand: (deviceId, command) =>
    set((state) => {
      const devices = state.devices.map((device) =>
        device.id === deviceId
          ? {
              ...device,
              automationState: commandState(command),
              lastHeartbeatAt: new Date().toISOString(),
              lastError:
                command === "relogin" && !device.internetReachable
                  ? "Internet kapali oldugu icin login ertelendi."
                  : undefined,
            }
          : device,
      );

      const nextEvent: DeviceEvent = {
        id: `evt-${state.events.length + 1}`,
        deviceId,
        level: command === "reposition" ? "success" : "info",
        eventType: command,
        message:
          command === "reposition"
            ? "Pencereler yeniden hizalama kuyruguna alindi."
            : `Komut calistirildi: ${command}`,
        createdAt: new Date().toISOString(),
      };

      const nextAudit: AuditEntry = {
        id: `audit-${state.auditTrail.length + 1}`,
        actor: "moe@control.local",
        action: `Komut: ${command}`,
        target: deviceId,
        createdAt: new Date().toISOString(),
      };

      return {
        devices,
        events: [nextEvent, ...state.events].slice(0, 16),
        auditTrail: [nextAudit, ...state.auditTrail].slice(0, 16),
      };
    }),
  runBulkRelogin: () =>
    set((state) => {
      const nextEvent: DeviceEvent = {
        id: `evt-${state.events.length + 1}`,
        deviceId: "all",
        level: "info",
        eventType: "bulk_relogin",
        message: "Tum uygun cihazlar relogin kuyruguna alindi.",
        createdAt: new Date().toISOString(),
      };

      const nextAudit: AuditEntry = {
        id: `audit-${state.auditTrail.length + 1}`,
        actor: "moe@control.local",
        action: "Toplu relogin",
        target: "Tum cihazlar",
        createdAt: new Date().toISOString(),
      };

      return {
        devices: state.devices.map((device) => ({
          ...device,
          automationState: device.internetReachable ? "logging_in" : "checking",
          lastHeartbeatAt: new Date().toISOString(),
        })),
        events: [nextEvent, ...state.events].slice(0, 16),
        auditTrail: [nextAudit, ...state.auditTrail].slice(0, 16),
      };
    }),
  saveExePath: (deviceId, exePath) =>
    set((state) => ({
      configs: {
        ...state.configs,
        [deviceId]: {
          ...state.configs[deviceId],
          exePath,
        },
      },
      devices: state.devices.map((device) =>
        device.id === deviceId
          ? {
              ...device,
              exePath,
            }
          : device,
      ),
    })),
}));
