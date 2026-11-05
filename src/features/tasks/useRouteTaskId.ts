import { useLocation } from "react-router";
import { taskIdFromPath } from "./filter.ts";

export function useRouteTaskId(): string | null {
  return taskIdFromPath(useLocation().pathname);
}
