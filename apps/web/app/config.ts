import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveConfig } from "@riebeckite/core";
import rawConfig from "../../../riebeckite.config";

const appRoot =
  process.env.RIEBECKITE_APP_ROOT ??
  fileURLToPath(new URL("../", import.meta.url));
const resolvedConfig = resolveConfig(rawConfig);

export const config = {
  ...resolvedConfig,
  content: {
    ...resolvedConfig.content,
    directory: path.resolve(appRoot, resolvedConfig.content.directory),
  },
};
