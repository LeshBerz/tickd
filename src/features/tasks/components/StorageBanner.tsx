import { createSelector } from "@reduxjs/toolkit";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../../../app/hooks.ts";
import {
  dismissAvailability,
  dismissLoadDiscarded,
  dismissSaveError,
} from "../../../app/persistenceSlice.ts";
import type { RootState } from "../../../app/store.ts";

type DismissKind = "save" | "load" | "availability";

type BannerConfig = {
  messageKey: "storage.unavailable" | "storage.quota" | "storage.discarded";
  role: "alert" | "status";
  danger: boolean;
  dismiss: DismissKind;
};

const selectPersistence = (state: RootState) => state.persistence;

const selectBanner = createSelector([selectPersistence], (persistence): BannerConfig | null => {
  const { available, loadDiscarded, saveError, availabilityDismissed } = persistence;

  if (saveError === "quota") {
    return { messageKey: "storage.quota", role: "alert", danger: true, dismiss: "save" };
  }
  if (saveError === "unavailable") {
    return { messageKey: "storage.unavailable", role: "alert", danger: true, dismiss: "save" };
  }
  if (loadDiscarded) {
    return { messageKey: "storage.discarded", role: "status", danger: false, dismiss: "load" };
  }
  if (!available && !availabilityDismissed) {
    return {
      messageKey: "storage.unavailable",
      role: "status",
      danger: false,
      dismiss: "availability",
    };
  }
  return null;
});

export function StorageBanner() {
  const { t } = useTranslation();
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
      <span className={`text-sm font-semibold flex-1 min-w-0 ${textClass}`}>
        {t(banner.messageKey)}
      </span>
      <button
        type="button"
        aria-label={t("storage.dismiss")}
        onClick={handleDismiss}
        className="shrink-0 text-text-muted hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center text-xl leading-none"
      >
        ×
      </button>
    </div>
  );
}
