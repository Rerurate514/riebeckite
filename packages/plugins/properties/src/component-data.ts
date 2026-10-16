import type { PluginDataHelper, PublicContentView } from "@riebeckite/core";
import { resolvePropertiesOptions } from "./options.js";
import type { PropertiesOptions } from "./types.js";

export type PropertiesData = {
  title: string;
  className: string;
  items: readonly { key: string; value: readonly PropertiesValuePart[] }[];
};

export type PropertiesValuePart = { text: string; href?: string };

export const getProperties: PluginDataHelper<
  {
    view: PublicContentView;
    frontmatter: Readonly<Record<string, unknown>>;
    options?: PropertiesOptions;
  },
  PropertiesData
> = ({ view, frontmatter, options }) => {
  const resolved = resolvePropertiesOptions(options);
  const entries = Object.entries(frontmatter).filter(
    ([key, value]) =>
      value !== undefined &&
      (resolved.include
        ? resolved.include.includes(key)
        : !resolved.exclude.includes(key)) &&
      (!resolved.hideEmpty || !isEmpty(value)),
  );
  const ordered = resolved.order
    ? [...entries].sort(
        ([left], [right]) =>
          orderOf(left, resolved.order ?? []) -
          orderOf(right, resolved.order ?? []),
      )
    : entries;
  return {
    title: resolved.title ?? "",
    className: resolved.className,
    items: ordered.map(([key, value]) => ({
      key,
      value: format(value, view),
    })),
  };
};

function orderOf(key: string, order: readonly string[]): number {
  const index = order.indexOf(key);
  return index < 0 ? order.length : index;
}

function isEmpty(value: unknown): boolean {
  return (
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function format(
  value: unknown,
  view: PublicContentView,
): readonly PropertiesValuePart[] {
  if (typeof value === "string") return formatString(value, view);
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  )
    return [{ text: String(value) }];
  if (value instanceof Date) return [{ text: value.toISOString() }];
  try {
    return [{ text: JSON.stringify(value) }];
  } catch {
    return [{ text: String(value) }];
  }
}

function formatString(
  value: string,
  view: PublicContentView,
): readonly PropertiesValuePart[] {
  const parts: PropertiesValuePart[] = [];
  const pattern = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;
  let position = 0;
  for (const match of value.matchAll(pattern)) {
    const target = match[1].trim();
    const label = match[2]?.trim() || target;
    const start = match.index ?? position;
    if (start > position) parts.push({ text: value.slice(position, start) });
    const [path, anchor] = target.split(/[#^]/, 2);
    const key = path?.trim() ?? "";
    const entry =
      key === ""
        ? undefined
        : (view.findRoutableBySlug(key) ?? view.findRoutableByAlias(key)[0]);
    parts.push(
      entry
        ? {
            text: label,
            href: anchor ? `${entry.permalink}#${anchor}` : entry.permalink,
          }
        : { text: label },
    );
    position = start + match[0].length;
  }
  if (position < value.length || parts.length === 0) {
    parts.push({ text: value.slice(position) });
  }
  return parts;
}
