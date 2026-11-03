export type Filter = "all" | "active" | "completed";
export const FILTERS: readonly Filter[] = ["all", "active", "completed"];
export const filterPaths: Record<Filter, string> = {
  all: "/",
  active: "/active",
  completed: "/completed",
};

export function filterFromPath(pathname: string): Filter | null {
  let normalized = pathname;
  if (normalized !== "/" && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  for (const filter of FILTERS) {
    if (filterPaths[filter] === normalized) {
      return filter;
    }
  }
  return null;
}
