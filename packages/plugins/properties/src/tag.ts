import { normalizeTag } from "@riebeckite/core";
import { DEFAULT_TAG_BASE } from "./options.js";

export function buildTagHref(
  raw: string,
  base: string = DEFAULT_TAG_BASE,
): string {
  const cleaned = raw.replace(/^#/, "").trim();
  const normalized = normalizeTag(cleaned) ?? cleaned;
  const path = normalized
    .split("/")
    .map((segment) => encodeURIComponent(segment.toLowerCase()))
    .join("/");
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${prefix}${path}`;
}
