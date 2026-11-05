export type Filter = "all" | "active" | "completed";
export const FILTERS: readonly Filter[] = ["all", "active", "completed"];
export const filterPaths: Record<Filter, string> = {
  all: "/",
  active: "/active",
  completed: "/completed",
};

const DETAIL_SEGMENT = "tasks";

function withoutTrailingSlash(pathname: string): string {
  if (pathname === "/" || !pathname.endsWith("/")) {
    return pathname;
  }
  return pathname.slice(0, -1);
}

/** `/<filter>/tasks/` prefix; the `all` filter has no segment of its own. */
function detailPrefix(filter: Filter): string {
  const base = filterPaths[filter];
  return base === "/" ? `/${DETAIL_SEGMENT}/` : `${base}/${DETAIL_SEGMENT}/`;
}

function decodeId(idSegment: string): string | null {
  try {
    const id = decodeURIComponent(idSegment);
    return id === "" ? null : id;
  } catch {
    return null;
  }
}

function detailMatch(normalizedPath: string): { filter: Filter; idSegment: string } | null {
  for (const filter of FILTERS) {
    const prefix = detailPrefix(filter);
    if (!normalizedPath.startsWith(prefix)) {
      continue;
    }
    const idSegment = normalizedPath.slice(prefix.length);
    return idSegment === "" || idSegment.includes("/") ? null : { filter, idSegment };
  }
  return null;
}

export function filterFromPath(pathname: string): Filter | null {
  const normalized = withoutTrailingSlash(pathname);
  for (const filter of FILTERS) {
    if (filterPaths[filter] === normalized) {
      return filter;
    }
  }
  const detail = detailMatch(normalized);
  if (detail === null || decodeId(detail.idSegment) === null) {
    return null;
  }
  return detail.filter;
}

/** The single builder of task detail URLs. */
export function taskPath(filter: Filter, id: string): string {
  const base = filterPaths[filter];
  const prefix = base === "/" ? `/${DETAIL_SEGMENT}` : `${base}/${DETAIL_SEGMENT}`;
  return `${prefix}/${encodeURIComponent(id)}`;
}

export function taskIdFromPath(pathname: string): string | null {
  const detail = detailMatch(withoutTrailingSlash(pathname));
  return detail === null ? null : decodeId(detail.idSegment);
}
