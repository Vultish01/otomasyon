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

export function formatPosition(position: WindowPosition) {
  return positionMap[position];
}
