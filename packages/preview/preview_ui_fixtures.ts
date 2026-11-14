import type { FixturePages } from "./preview_ui_types.js";

export function readPageMarkdown(
  root: HTMLElement,
  fixtureId: string,
  pageId: string,
): string | undefined {
  return readFixturePages(root.dataset.previewPages, fixtureId)?.pages.find(
    (page) => page.id === pageId,
  )?.markdown;
}

export function readFixtureMarkdown(
  root: HTMLElement,
  fixtureId: string,
): string | undefined {
  return readSerializedMarkdown(root.dataset.previewFixtures, fixtureId);
}

export function readSerializedMarkdown(
  serialized: string | undefined,
  id: string,
): string | undefined {
  if (!serialized) return undefined;
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return undefined;
    }
    const value = (parsed as Record<string, unknown>)[id];
    return typeof value === "string" ? value : undefined;
  } catch {
    return undefined;
  }
}

export function readFixturePages(
  serialized: string | undefined,
  fixtureId: string,
): FixturePages | undefined {
  if (!serialized) return undefined;
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return undefined;
    }
    const value = (parsed as Record<string, unknown>)[fixtureId];
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }
    const record = value as Record<string, unknown>;
    if (!Array.isArray(record.pages)) return undefined;
    const pages = record.pages.flatMap((page) => {
      if (!page || typeof page !== "object" || Array.isArray(page)) return [];
      const item = page as Record<string, unknown>;
      return typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.markdown === "string"
        ? [{ id: item.id, title: item.title, markdown: item.markdown }]
        : [];
    });
    if (pages.length !== record.pages.length) return undefined;
    return {
      pages,
      ...(typeof record.currentPageId === "string"
        ? { currentPageId: record.currentPageId }
        : {}),
    };
  } catch {
    return undefined;
  }
}
