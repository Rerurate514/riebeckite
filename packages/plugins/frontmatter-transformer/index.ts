import { definePlugin } from "@riebeckite/core";
import { createFrontmatterCommands } from "./src/commands.js";

export { createFrontmatterCommands } from "./src/commands.js";
export {
  FRONTMATTER_PRESETS,
  type FrontmatterPreset,
  frontmatterPresetRegistry,
} from "./src/presets.js";

export const FRONTMATTER_TRANSFORMER_PLUGIN_NAME = "frontmatter-transformer";

export function frontmatterTransformer() {
  return definePlugin({
    name: FRONTMATTER_TRANSFORMER_PLUGIN_NAME,
    cli: {
      namespace: "frontmatter",
      commands: createFrontmatterCommands(),
    },
  });
}
