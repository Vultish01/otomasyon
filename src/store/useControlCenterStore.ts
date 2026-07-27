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
  devices: [],
  configs: {},
  events: [],
  auditTrail: [],
  selectedDeviceId: "",
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
