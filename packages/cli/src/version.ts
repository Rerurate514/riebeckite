import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export const cliVersion = readVersion(require("../package.json"));

function readVersion(value: unknown): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "version" in value &&
    typeof value.version === "string"
  ) {
    return value.version;
  }
  throw new Error("The CLI package manifest is missing a version.");
}
