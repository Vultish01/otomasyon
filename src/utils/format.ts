import type { WindowPosition } from "@shared/types";

const positionMap: Record<WindowPosition, string> = {
  top_left: "Sol ust",
  top_right: "Sag ust",
  bottom_left: "Sol alt",
  bottom_right: "Sag alt",
};

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

export function formatRelativeTime(value: string) {
  const target = new Date(value).getTime();
  const deltaSec = Math.round((target - Date.now()) / 1000);

  if (Number.isNaN(deltaSec)) {
    return "-";
  }

  const rtf = new Intl.RelativeTimeFormat("tr-TR", { numeric: "auto" });

  if (Math.abs(deltaSec) < 60) {
    return rtf.format(deltaSec, "second");
  }

  const deltaMin = Math.round(deltaSec / 60);
  if (Math.abs(deltaMin) < 60) {
    return rtf.format(deltaMin, "minute");
  }

  const deltaHour = Math.round(deltaMin / 60);
  if (Math.abs(deltaHour) < 24) {
    return rtf.format(deltaHour, "hour");
  }

  const deltaDay = Math.round(deltaHour / 24);
  return rtf.format(deltaDay, "day");
}

export function formatPosition(position: WindowPosition) {
  return positionMap[position];
}

export function isHeartbeatFresh(value: string, maxAgeSec = 45) {
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) {
    return false;
  }
  return Date.now() - target <= maxAgeSec * 1000;
}
