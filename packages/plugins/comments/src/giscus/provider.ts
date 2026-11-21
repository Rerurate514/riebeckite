import type { CommentsProvider, GiscusOptions } from "../types.js";
import { resolveGiscusPublicConfig, validateGiscusOptions } from "./options.js";

export const GISCUS_PROVIDER_NAME = "giscus";

export function giscus(options: GiscusOptions): CommentsProvider {
  return {
    name: GISCUS_PROVIDER_NAME,
    client: {
      moduleSpecifier: "@riebeckite/plugin-comments/client",
      exportName: "initGiscusComments",
    },
    publicConfig: resolveGiscusPublicConfig(options),
    validateOptions: () => validateGiscusOptions(options),
  };
}
