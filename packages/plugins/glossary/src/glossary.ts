import {
  type ContentManifestEntry,
  escapeHtml,
  escapeHtmlAttribute,
} from "@riebeckite/core";
import type {
  GlossaryEntry,
  GlossaryOptions,
  ResolvedGlossaryOptions,
} from "./types.js";

export const DEFAULT_GLOSSARY_BASE_PATH = "/glossary";
export const DEFAULT_GLOSSARY_CLASS_NAME = "rb-glossary";
export const DEFAULT_GLOSSARY_KEY = "glossary";

export function resolveGlossaryOptions(
  options: GlossaryOptions = {},
): ResolvedGlossaryOptions {
  return {
    basePath: normalizeBasePath(options.basePath ?? DEFAULT_GLOSSARY_BASE_PATH),
    className: options.className?.trim() || DEFAULT_GLOSSARY_CLASS_NAME,
    key: options.key?.trim() || DEFAULT_GLOSSARY_KEY,
    termKey: options.termKey?.trim() || "term",
    definitionKey: options.definitionKey?.trim() || "definition",
    title: options.title?.trim() || "Glossary",
  };
}

export function buildGlossary(
  entries: readonly ContentManifestEntry[],
  options: ResolvedGlossaryOptions,
): GlossaryEntry[] {
  return entries
    .filter((entry) => entry.frontmatter[options.key] === true)
    .map((entry) => ({
      term: stringValue(entry.frontmatter[options.termKey]) ?? entry.title,
      definition: stringValue(entry.frontmatter[options.definitionKey]),
      permalink: entry.permalink,
    }))
    .toSorted((left, right) =>
      left.term.localeCompare(right.term, undefined, { sensitivity: "base" }),
    );
}

export function renderGlossaryPage(
  entries: readonly GlossaryEntry[],
  options: ResolvedGlossaryOptions,
) {
  const className = escapeHtmlAttribute(options.className);
  const items = entries
    .map(
      (entry) =>
        `<div class="${className}__item"><dt class="${className}__term"><a class="${className}__link" href="${escapeHtmlAttribute(entry.permalink)}">${escapeHtml(entry.term)}</a></dt>${entry.definition ? `<dd class="${className}__definition">${escapeHtml(entry.definition)}</dd>` : ""}</div>`,
    )
    .join("");
  return {
    title: options.title,
    html: `<section class="${className}" data-rr-glossary><h1 class="${className}__title">${escapeHtml(options.title)}</h1><dl class="${className}__list">${items}</dl></section>`,
  };
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function normalizeBasePath(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (trimmed === "") return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}
