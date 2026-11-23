import { Easing } from "remotion";

export const colors = {
  background: "#0c0f14",
  panel: "#141920",
  panelBorder: "#28323e",
  text: "#edf2f8",
  muted: "#a9b5c5",
  dim: "#6d7c8e",
  accent: "#62aaff",
};

export const sans =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Noto Sans JP", sans-serif';

export const mono =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

export const easeOut = Easing.bezier(0.23, 1, 0.32, 1);
export const easeInOut = Easing.bezier(0.77, 0, 0.175, 1);
