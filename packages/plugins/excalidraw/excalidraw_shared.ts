import type { createExcalidrawRenderSession } from "./src/render-static.js";

export const PLUGIN_NAME = "excalidraw";
export type ExcalidrawSession = ReturnType<
  typeof createExcalidrawRenderSession
>;
export const EMPTY_SCENE_SVG = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
