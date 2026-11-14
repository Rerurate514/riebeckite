import type { Heading, Link, List, ListItem, Paragraph } from "mdast";
import type { RenderContext } from "./citations_types.js";
import { pushUniqueDiagnostics } from "./paths.js";
import type { BibliographyEntry, CitationReference } from "./types.js";

export function renderCitation(
  references: readonly CitationReference[],
  bracketed: boolean,
  context: RenderContext,
): Link {
  const renderedReferences = references.map((reference) =>
    renderCitationReference(reference, context),
  );
  const separator = renderedReferences.some((item) => item.hasAffix)
    ? "; "
    : ", ";
  const text = renderedReferences.map((item) => item.text).join(separator);
  const label = bracketed ? `[${text}]` : text;

  const occurrenceId =
    `citation-${context.options.sourceSlug ?? "page"}-${context.occurrences.length + 1}`.replace(
      /[^A-Za-z0-9_-]/g,
      "-",
    );
  context.occurrences.push({
    id: occurrenceId,
    pageSlug: context.options.sourceSlug,
    references,
    label,
    syntax: bracketed
      ? references.some((item) => item.suppressAuthor)
        ? "suppress-author"
        : "bracket"
      : "inline",
  });

  return {
    type: "link",
    url: `#user-content-${referenceId(references[0]?.key ?? "unknown", context)}`,
    title: null,
    children: [{ type: "text", value: label }],
  };
}

export function renderCitationReference(
  reference: CitationReference,
  context: RenderContext,
): { text: string; hasAffix: boolean } {
  const number = numberForReference(reference, context).toString();
  return {
    text: citationReferenceText(reference.prefix, number, reference.suffix),
    hasAffix: Boolean(reference.prefix || reference.suffix),
  };
}

export function citationReferenceText(
  prefix: string | undefined,
  number: string,
  suffix: string | undefined,
): string {
  const withPrefix = prefix ? `${prefix} ${number}` : number;
  if (!suffix) return withPrefix;
  return /^[,.;:)]/.test(suffix)
    ? `${withPrefix}${suffix}`
    : `${withPrefix} ${suffix}`;
}

export function createReferencesHeading(text = "References"): Heading {
  return {
    type: "heading",
    depth: 2,
    children: [{ type: "text", value: text }],
  };
}

export function createReferencesList(context: RenderContext): List {
  return {
    type: "list",
    ordered: true,
    start: 1,
    spread: false,
    children: context.orderedKeys.map(
      (key): ListItem => ({
        type: "listItem",
        spread: false,
        data: { hProperties: { id: referenceId(key, context) } },
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "text",
                value: renderBibliographyEntry(context.entries.get(key), key),
              },
            ],
          } satisfies Paragraph,
        ],
      }),
    ),
  };
}

export function renderBibliographyEntry(
  entry: BibliographyEntry | undefined,
  key: string,
): string {
  if (!entry) return key;
  const author = entry.fields.author ?? entry.fields.editor;
  const year = entry.fields.year ?? entry.fields.date;
  const title = entry.fields.title;
  const container =
    entry.fields.journal ?? entry.fields.booktitle ?? entry.fields.publisher;
  return [author, year ? `(${year})` : undefined, title, container]
    .filter(Boolean)
    .join(". ");
}

export function numberForReference(
  reference: CitationReference,
  context: RenderContext,
): number {
  const existing = context.numbers.get(reference.key);
  if (existing) return existing;

  const number = context.orderedKeys.length + 1;
  context.numbers.set(reference.key, number);
  context.orderedKeys.push(reference.key);
  referenceId(reference.key, context);

  if (!context.entries.has(reference.key)) {
    pushUniqueDiagnostics(
      context.options.diagnostics,
      [
        {
          code: "citation-unknown-key",
          severity: "warning",
          message: `Unknown citation key: ${reference.key}`,
          slug: context.options.sourceSlug,
          target: reference.key,
        },
      ],
      context.options.sourceSlug,
    );
  }
  return number;
}

export function referenceId(key: string, context: RenderContext): string {
  const existing = context.referenceIds.get(key);
  if (existing) return existing;

  const sanitized = key
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const base = `ref-${sanitized || "key"}`;
  let id = base;
  let counter = 2;
  while (context.usedReferenceIds.has(id)) {
    id = `${base}-${counter}`;
    counter += 1;
  }
  context.referenceIds.set(key, id);
  context.usedReferenceIds.add(id);
  return id;
}
