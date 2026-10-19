import type { MarkdownEmbedFragment } from "./types/plugin_pipeline.js";

export function selectEmbedMarkdownFragment(
  markdown: string,
  fragment: MarkdownEmbedFragment | null,
): string | null {
  if (!fragment) return markdown;
  if (fragment.kind === "block")
    return selectBlockFragment(markdown, fragment.value);
  return selectHeadingFragment(markdown, fragment.value);
}

function selectBlockFragment(markdown: string, blockId: string): string | null {
  const lines = markdown.split(/\r?\n/);
  const blockIdRe = new RegExp(`(?:^|\\s)\\^${escapeRegExp(blockId)}\\s*$`);
  const line = lines.find((currentLine) => blockIdRe.test(currentLine));
  return line?.replace(blockIdRe, "").trimEnd() || null;
}

function selectHeadingFragment(
  markdown: string,
  heading: string,
): string | null {
  const lines = markdown.split(/\r?\n/);
  const targetHeading = heading.trim().toLowerCase();
  const startIndex = lines.findIndex((line) => {
    const match = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    return match?.[2]?.trim().toLowerCase() === targetHeading;
  });
  if (startIndex < 0) return null;

  const level = lines[startIndex]?.match(/^(#{1,6})\s+/)?.[1]?.length ?? 6;
  const endIndex = lines.findIndex((line, index) => {
    if (index <= startIndex) return false;
    const match = line.match(/^(#{1,6})\s+/);
    return match !== null && match[1].length <= level;
  });

  const selectedLines = lines.slice(
    startIndex,
    endIndex === -1 ? undefined : endIndex,
  );
  return selectedLines.join("\n").trim() || null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
