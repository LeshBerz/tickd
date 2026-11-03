import { useAppDispatch, useAppSelector } from "../../../app/hooks.ts";
import {
  dismissAvailability,
  dismissLoadDiscarded,
  dismissSaveError,
} from "../../../app/persistenceSlice.ts";
import type { RootState } from "../../../app/store.ts";

const UNAVAILABLE_COPY = "Can't save tasks — browser storage is unavailable.";
const QUOTA_COPY = "Can't save tasks — browser storage is full.";
const DISCARDED_COPY = "Couldn't restore saved tasks. Starting fresh.";

type DismissKind = "save" | "load" | "availability";

type BannerConfig = {
  copy: string;
  role: "alert" | "status";
  danger: boolean;
  dismiss: DismissKind;
};

function selectBanner(state: RootState): BannerConfig | null {
  const { available, loadDiscarded, saveError, availabilityDismissed } = state.persistence;

  if (saveError === "quota") {
    return { copy: QUOTA_COPY, role: "alert", danger: true, dismiss: "save" };
  }
  if (saveError === "unavailable") {
    return { copy: UNAVAILABLE_COPY, role: "alert", danger: true, dismiss: "save" };
  }
  if (loadDiscarded) {
    return { copy: DISCARDED_COPY, role: "status", danger: false, dismiss: "load" };
  }
  if (!available && !availabilityDismissed) {
    return { copy: UNAVAILABLE_COPY, role: "status", danger: false, dismiss: "availability" };
  }
  return null;
}

export function StorageBanner() {
  const dispatch = useAppDispatch();
  const banner = useAppSelector(selectBanner);

  if (banner === null) {
    return null;
  }

  const borderClass = banner.danger ? "border-danger" : "border-border";
  const textClass = banner.danger ? "text-danger" : "text-text-muted";

  const handleDismiss = () => {
    if (banner.dismiss === "save") {
      dispatch(dismissSaveError());
      return;
    }
    if (banner.dismiss === "load") {
      dispatch(dismissLoadDiscarded());
      return;
    }
    dispatch(dismissAvailability());
  };

  return (
    <div
      role={banner.role}
      className={`mb-4 border ${borderClass} bg-card rounded-card p-3 flex items-center justify-between gap-3`}
    >
      <span className={`text-sm font-semibold flex-1 min-w-0 ${textClass}`}>{banner.copy}</span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={handleDismiss}
        className="shrink-0 text-text-muted hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center text-xl leading-none"
      >
        ×
      </button>
    </div>
  );
}
