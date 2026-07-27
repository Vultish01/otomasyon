import { create } from "zustand";
import type {
  AuditEntry,
  DeviceCommand,
  DeviceConfig,
  DeviceEvent,
  DeviceRegistrationRequest,
  DeviceStatus,
  WorkerConfigPayload,
} from "@shared/types";
import {
  fetchDeviceDetail,
  fetchDevices,
  fetchLogs,
  fetchWorkerConfig,
  postCommand,
  registerDevice,
  updateDeviceConfig,
} from "@/lib/api";

type ControlCenterState = {
  devices: DeviceStatus[];
  configs: Record<string, DeviceConfig>;
  events: DeviceEvent[];
  auditTrail: AuditEntry[];
  selectedDeviceId: string;
  isLoadingDevices: boolean;
  isLoadingDeviceDetail: boolean;
  isSavingConfig: boolean;
  isRegisteringDevice: boolean;
  workerConfigByDeviceId: Record<string, WorkerConfigPayload>;
  lastSyncError?: string;
  setSelectedDeviceId: (deviceId: string) => void;
  loadDashboardData: () => Promise<void>;
  loadDeviceDetail: (deviceId: string) => Promise<void>;
  runCommand: (deviceId: string, command: DeviceCommand) => Promise<void>;
  runBulkRelogin: () => Promise<void>;
  saveDeviceConfig: (config: DeviceConfig) => Promise<void>;
  registerNewDevice: (payload: DeviceRegistrationRequest) => Promise<string>;
  loadWorkerConfig: (deviceId: string) => Promise<void>;
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
];

const seededAudit: AuditEntry[] = [
  {
    id: "audit-1",
    actor: "moe@control.local",
    action: "Toplu relogin",
    target: "Tum cihazlar",
    createdAt: "2026-07-27T02:20:00.000Z",
  },
];

function buildAuditEntry(action: string, target: string): AuditEntry {
  return {
    id: `audit-${Date.now()}`,
    actor: "moe@control.local",
    action,
    target,
    createdAt: new Date().toISOString(),
  };
}

export const useControlCenterStore = create<ControlCenterState>((set, get) => ({
  devices: seededDevices,
  configs: seededConfigs,
  events: seededEvents,
  auditTrail: seededAudit,
  selectedDeviceId: "win-floor-01",
  isLoadingDevices: false,
  isLoadingDeviceDetail: false,
  isSavingConfig: false,
  isRegisteringDevice: false,
  workerConfigByDeviceId: {},
  lastSyncError: undefined,
  setSelectedDeviceId: (deviceId) => set({ selectedDeviceId: deviceId }),
  loadDashboardData: async () => {
    set({ isLoadingDevices: true, lastSyncError: undefined });
    try {
      const [devices, events] = await Promise.all([fetchDevices(), fetchLogs()]);
      set({
        devices,
        events: events.slice(0, 16),
        isLoadingDevices: false,
      });
    } catch (error) {
      set({
        isLoadingDevices: false,
        lastSyncError: error instanceof Error ? error.message : "Cihaz verileri alinamadi.",
      });
    }
  },
  loadDeviceDetail: async (deviceId) => {
    set({ isLoadingDeviceDetail: true, lastSyncError: undefined });
    try {
      const { device, config } = await fetchDeviceDetail(deviceId);
      set((state) => ({
        devices: state.devices.some((item) => item.id === device.id)
          ? state.devices.map((item) => (item.id === device.id ? device : item))
          : [device, ...state.devices],
        configs: {
          ...state.configs,
          [deviceId]: config,
        },
        selectedDeviceId: deviceId,
        isLoadingDeviceDetail: false,
      }));
    } catch (error) {
      set({
        isLoadingDeviceDetail: false,
        lastSyncError: error instanceof Error ? error.message : "Cihaz detayi alinamadi.",
      });
    }
  },
  runCommand: async (deviceId, command) => {
    try {
      await postCommand(deviceId, command);
      set((state) => ({
        auditTrail: [buildAuditEntry(`Komut: ${command}`, deviceId), ...state.auditTrail].slice(0, 16),
      }));
      await get().loadDashboardData();
      await get().loadDeviceDetail(deviceId);
    } catch (error) {
      set({
        lastSyncError: error instanceof Error ? error.message : "Komut gonderilemedi.",
      });
    }
  },
  runBulkRelogin: async () => {
    await Promise.all(get().devices.map((device) => get().runCommand(device.id, "relogin")));
  },
  saveDeviceConfig: async (config) => {
    set({ isSavingConfig: true, lastSyncError: undefined });
    try {
      await updateDeviceConfig(config);
      set((state) => ({
        configs: {
          ...state.configs,
          [config.deviceId]: config,
        },
        auditTrail: [buildAuditEntry("Konfigrasyon guncellendi", config.deviceId), ...state.auditTrail].slice(0, 16),
        isSavingConfig: false,
      }));
      await get().loadDeviceDetail(config.deviceId);
      await get().loadWorkerConfig(config.deviceId);
    } catch (error) {
      set({
        isSavingConfig: false,
        lastSyncError: error instanceof Error ? error.message : "Konfigrasyon kaydedilemedi.",
      });
    }
  },
  registerNewDevice: async (payload) => {
    set({ isRegisteringDevice: true, lastSyncError: undefined });
    try {
      const result = await registerDevice(payload);
      set((state) => ({
        devices: [result.device, ...state.devices],
        configs: {
          ...state.configs,
          [result.device.id]: result.config,
        },
        workerConfigByDeviceId: {
          ...state.workerConfigByDeviceId,
          [result.device.id]: result.workerConfig,
        },
        selectedDeviceId: result.device.id,
        auditTrail: [buildAuditEntry("Yeni cihaz kaydi", result.device.id), ...state.auditTrail].slice(0, 16),
        isRegisteringDevice: false,
      }));
      await get().loadDashboardData();
      return result.device.id;
    } catch (error) {
      set({
        isRegisteringDevice: false,
        lastSyncError: error instanceof Error ? error.message : "Yeni cihaz kaydi basarisiz.",
      });
      throw error;
    }
  },
  loadWorkerConfig: async (deviceId) => {
    try {
      const workerConfig = await fetchWorkerConfig(deviceId);
      set((state) => ({
        workerConfigByDeviceId: {
          ...state.workerConfigByDeviceId,
          [deviceId]: workerConfig,
        },
      }));
    } catch (error) {
      set({
        lastSyncError: error instanceof Error ? error.message : "Worker config alinamadi.",
      });
    }
  },
}));
