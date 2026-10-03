import { initLightbox } from "./src/init.js";
import type { LightboxInitOptions } from "./src/types.js";

export { initLightbox } from "./src/init.js";

export function initLightboxFromOptions(
  options: LightboxInitOptions = {},
): () => void {
  return initLightbox(document, options);
}
