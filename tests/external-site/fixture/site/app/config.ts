import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveConfigModule } from "@riebeckite/core";
import * as rawConfigModule from "../riebeckite.config";

const appRoot =
  process.env.RIEBECKITE_APP_ROOT ??
  fileURLToPath(new URL("../", import.meta.url));
const resolvedConfig = resolveConfigModule(rawConfigModule);

export const config = {
  ...resolvedConfig,
  content: {
    ...resolvedConfig.content,
    directory: path.resolve(appRoot, resolvedConfig.content.directory)
  }
};
