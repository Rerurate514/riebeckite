import packageJson from "../package.json";

export const cliVersion = readVersion(packageJson);

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
