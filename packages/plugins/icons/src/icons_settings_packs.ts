import type { IconizeSettings } from "./types.js";

export function isLucidePackType(
  value: unknown,
): value is IconizeSettings["lucideIconPackType"] {
  return value === "none" || value === "custom" || value === "native";
}
