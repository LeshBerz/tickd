import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks.ts";
import { selectGuideCompleted } from "../preferences/selectors.ts";
import { openGuide } from "./guideSlice.ts";

/**
 * Opens the tour once per session for a user who has never finished or skipped it.
 * The effect runs after the first commit, so every target is already in the DOM.
 */
export function useFirstVisitGuide(): void {
  const dispatch = useAppDispatch();
  const completed = useAppSelector(selectGuideCompleted);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || completed) {
      return;
    }
    started.current = true;
    dispatch(openGuide());
  }, [completed, dispatch]);
}
