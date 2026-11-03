import { useLocation } from "react-router";
import { type Filter, filterFromPath } from "./filter.ts";

export function useRouteFilter(): Filter {
  return filterFromPath(useLocation().pathname) ?? "all";
}
