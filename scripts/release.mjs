#!/usr/bin/env node

export { main, parseArguments, runRelease } from "./release_args.mjs";
export {
  classifyPublishFailure,
  isAuthenticationOutput,
  isNotFoundOutput,
  isPermissionOutput,
  isTransientOutput,
  isVersionConflictOutput,
} from "./release_classify.mjs";
export {
  PACKAGE_STATE,
  PUBLISH_FAILURE,
  PublishError,
  ReleaseError,
} from "./release_core.mjs";
export { runtime } from "./release_process.mjs";

import path from "node:path";
import { pathToFileURL } from "node:url";
import { main } from "./release_args.mjs";

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  await main();
}
