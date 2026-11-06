import { createSlice } from "@reduxjs/toolkit";

export type GuideState = { open: boolean };

export const initialGuideState: GuideState = { open: false };

/** Session state only: whether the tour is on screen is not persisted. */
export const guideSlice = createSlice({
  name: "guide",
  initialState: initialGuideState,
  reducers: {
    openGuide(state) {
      state.open = true;
    },
    closeGuide(state) {
      state.open = false;
    },
  },
});

export const { openGuide, closeGuide } = guideSlice.actions;
