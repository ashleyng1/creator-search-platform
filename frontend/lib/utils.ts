export function creatorAvatarUrl(handle: string, name?: string): string {
  const label = encodeURIComponent(name || handle);
  return `https://ui-avatars.com/api/?name=${label}&background=ede9fe&color=5b21b6&size=80&bold=true`;
}

export function followerTier(followers: number): string {
  if (followers >= 5_000_000) return "Mega";
  if (followers >= 500_000) return "Macro";
  if (followers >= 100_000) return "Mid";
  if (followers >= 10_000) return "Micro";
  return "Nano";
}

export type ViewMode = "list" | "grid";

export function getStoredViewMode(key: string, fallback: ViewMode = "list"): ViewMode {
  if (typeof window === "undefined") return fallback;
  const v = localStorage.getItem(key);
  return v === "grid" || v === "list" ? v : fallback;
}

export function setStoredViewMode(key: string, mode: ViewMode) {
  localStorage.setItem(key, mode);
}
