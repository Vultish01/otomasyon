import { useControlCenterStore } from "@/store/useControlCenterStore";

describe("useControlCenterStore", () => {
  it("komut calistiginda ilgili cihazin durumunu gunceller", () => {
    useControlCenterStore.getState().runCommand("win-floor-01", "reposition");

    const device = useControlCenterStore
      .getState()
      .devices.find((item) => item.id === "win-floor-01");

    expect(device?.automationState).toBe("positioning");
  });

  it("exe yolu kaydedildiginde cihaz ve config birlikte guncellenir", () => {
    const nextPath = "E:\\NewPath\\broker.exe";

    useControlCenterStore.getState().saveExePath("win-floor-01", nextPath);

    expect(useControlCenterStore.getState().configs["win-floor-01"].exePath).toBe(nextPath);
    expect(
      useControlCenterStore.getState().devices.find((item) => item.id === "win-floor-01")?.exePath,
    ).toBe(nextPath);
  });
});
