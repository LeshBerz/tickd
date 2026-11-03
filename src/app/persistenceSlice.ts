import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type SaveError = "quota" | "unavailable";

export type PersistenceState = {
  available: boolean;
  loadDiscarded: boolean;
  saveError: SaveError | null;
  availabilityDismissed: boolean;
};

export const initialState: PersistenceState = {
  available: true,
  loadDiscarded: false,
  saveError: null,
  availabilityDismissed: false,
};

export const persistenceSlice = createSlice({
  name: "persistence",
  initialState,
  reducers: {
    reportSaveError(state, action: PayloadAction<SaveError>) {
      state.saveError = action.payload;
    },
    clearSaveError(state) {
      state.saveError = null;
    },
    dismissSaveError(state) {
      state.saveError = null;
    },
    dismissLoadDiscarded(state) {
      state.loadDiscarded = false;
    },
    dismissAvailability(state) {
      state.availabilityDismissed = true;
    },
  },
});

export const {
  reportSaveError,
  clearSaveError,
  dismissSaveError,
  dismissLoadDiscarded,
  dismissAvailability,
} = persistenceSlice.actions;
