import type {
  PropertiesRenderContext,
  PropertyInlinePart,
  PropertyValue,
} from "./types.js";

const WIKILINK_PATTERN = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;

type InlineState = {
  readonly context: PropertiesRenderContext;
};

export function convertInline(
  value: string,
  state: InlineState,
  wikilinksOnly: boolean,
): PropertyValue | null {
  const pattern = wikilinksOnly
    ? new RegExp(WIKILINK_PATTERN.source, "g")
    : new RegExp(
        `${WIKILINK_PATTERN.source}|(https?:\\/\\/[^\\s<>"'()]+)`,
        "g",
      );
  const parts: PropertyInlinePart[] = [];
  let position = 0;
  let hasLink = false;

  for (const match of value.matchAll(pattern)) {
    const start = match.index ?? position;
    if (start > position) {
      parts.push({ kind: "text", text: value.slice(position, start) });
    }

    if (match[1] !== undefined) {
      const part = wikilinkValue(
        match[1].trim(),
        (match[2] ?? match[1]).trim(),
        state,
      );
      if (part) {
        parts.push(part);
        hasLink = true;
      } else {
        parts.push({ kind: "text", text: match[0] });
      }
    } else if (match[3] !== undefined) {
      const href = safeHref(match[3]);
      if (href) {
        parts.push({
          kind: "link",
          text: match[3],
          href,
          external: isExternalHref(href),
        });
        hasLink = true;
      } else {
        parts.push({ kind: "text", text: match[3] });
      }
    }

    position = start + match[0].length;
  }

  if (!hasLink) return null;
  if (position < value.length) {
    parts.push({ kind: "text", text: value.slice(position) });
  }

  const onlyPart = parts[0];
  if (parts.length === 1 && onlyPart?.kind === "link") return onlyPart;
  return { kind: "inline", parts };
}

export function wikilinkValue(
  target: string,
  label: string,
  state: InlineState,
): Extract<PropertyValue, { kind: "link" }> | null {
  const [path, anchor] = target.split(/[#^]/, 2);
  const href = path ? state.context.resolveLink?.(path.trim()) : null;
  if (!href) return null;

  const withAnchor = anchor ? `${href}#${anchor}` : href;
  const safe = safeHref(withAnchor);
  if (!safe) return null;
  return {
    kind: "link",
    text: label || target,
    href: safe,
    external: isExternalHref(safe),
  };
}

export function matchWholeWikilink(
  value: string,
): { target: string; label: string } | null {
  const match = /^\s*\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]\s*$/.exec(value);
  if (!match?.[1]) return null;
  return {
    target: match[1].trim(),
    label: (match[2] ?? match[1]).trim(),
  };
}

export function safeHref(value: string): string | null {
  const href = value.trim();
  if (href === "" || hasControlCharacter(href)) return null;
  if (href.startsWith("#")) return href;
  if (href.startsWith("/") && !href.startsWith("//") && !href.includes("\\")) {
    return href;
  }

  try {
    const url = new URL(href);
    return url.protocol === "http:" || url.protocol === "https:" ? href : null;
  } catch {
    return null;
  }
}

export function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0);
    if (code !== undefined && (code <= 0x1f || code === 0x7f)) return true;
  }
  return false;
}
