import type { ExcaliBrainNodeRole, ExcaliBrainOntology } from "./types.js";

export type ExcaliBrainFieldRole =
  | "parents"
  | "children"
  | "leftFriends"
  | "rightFriends"
  | "previous"
  | "next"
  | "hidden";

/** ExcaliBrain's default ontology field names. */
export const DEFAULT_ONTOLOGY: Required<ExcaliBrainOntology> = {
  parents: ["parent", "parents", "up", "u", "north", "origin", "inception"],
  children: [
    "children",
    "child",
    "down",
    "d",
    "south",
    "leads to",
    "contributes to",
  ],
  leftFriends: [
    "friends",
    "friend",
    "similar",
    "supports",
    "alternatives",
    "advantages",
  ],
  rightFriends: ["opposes", "disadvantages", "missing", "cons"],
  previous: ["previous", "prev", "west", "w", "before"],
  next: ["next", "n", "east", "e", "after"],
  hidden: ["hidden"],
};

/** Canonical processing order; earlier roles win when a target is listed twice. */
export const FIELD_ROLE_ORDER: readonly ExcaliBrainFieldRole[] = [
  "parents",
  "children",
  "leftFriends",
  "rightFriends",
  "previous",
  "next",
  "hidden",
];

const FIELD_TO_NODE_ROLE: Record<
  Exclude<ExcaliBrainFieldRole, "hidden">,
  ExcaliBrainNodeRole
> = {
  parents: "parent",
  children: "child",
  leftFriends: "leftFriend",
  rightFriends: "rightFriend",
  previous: "previous",
  next: "next",
};

export type ResolvedOntology = {
  /** Normalized field name to ontology role. */
  fieldRole: Map<string, ExcaliBrainFieldRole>;
};

export type DefinedRelation = {
  role: ExcaliBrainNodeRole;
  target: string;
};

/** Lowercase a field name and normalize spaces to hyphens. */
export function normalizeFieldName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

export function resolveOntology(
  overrides: ExcaliBrainOntology = {},
): ResolvedOntology {
  const merged: Required<ExcaliBrainOntology> = {
    ...DEFAULT_ONTOLOGY,
  };
  // Ontology overrides extend the defaults per role rather than replacing them.
  for (const role of FIELD_ROLE_ORDER) {
    const extra = overrides[role];
    if (extra && extra.length > 0) {
      merged[role] = [...DEFAULT_ONTOLOGY[role], ...extra];
    }
  }

  const fieldRole = new Map<string, ExcaliBrainFieldRole>();

  for (const role of FIELD_ROLE_ORDER) {
    for (const field of merged[role] ?? []) {
      const normalized = normalizeFieldName(field);
      if (normalized && !fieldRole.has(normalized)) {
        fieldRole.set(normalized, role);
      }
    }
  }

  return { fieldRole };
}

export function fieldRoleOf(
  field: string,
  ontology: ResolvedOntology,
): ExcaliBrainFieldRole | null {
  return ontology.fieldRole.get(normalizeFieldName(field)) ?? null;
}

/**
 * Collect explicit relations from YAML frontmatter and dataview inline fields.
 * Results follow {@link FIELD_ROLE_ORDER} so defined relations are deterministic.
 */
export function collectDefinedRelations(input: {
  frontmatter: Record<string, unknown>;
  markdown: string;
  ontology: ResolvedOntology;
}): DefinedRelation[] {
  const relations: DefinedRelation[] = [];
  const inlineFields = extractInlineFields(input.markdown);

  for (const role of FIELD_ROLE_ORDER) {
    if (role === "hidden") continue;
    const nodeRole = FIELD_TO_NODE_ROLE[role];

    for (const [field, value] of Object.entries(input.frontmatter)) {
      if (fieldRoleOf(field, input.ontology) !== role) continue;
      for (const target of extractTargets(value)) {
        relations.push({ role: nodeRole, target });
      }
    }

    for (const [field, value] of inlineFields) {
      if (fieldRoleOf(field, input.ontology) !== role) continue;
      for (const target of extractTargets(value)) {
        relations.push({ role: nodeRole, target });
      }
    }
  }

  return relations;
}

export function isNoteHidden(input: {
  frontmatter: Record<string, unknown>;
  markdown: string;
  ontology: ResolvedOntology;
}): boolean {
  for (const field of Object.keys(input.frontmatter)) {
    if (fieldRoleOf(field, input.ontology) === "hidden") return true;
  }
  for (const [field] of extractInlineFields(input.markdown)) {
    if (fieldRoleOf(field, input.ontology) === "hidden") return true;
  }
  return false;
}

const WIKILINK_PATTERN = /\[\[([^\]|#^]+)(?:[#^][^\]|]+)?(?:\|[^\]]+)?\]\]/g;

/** Extract `[[target]]` link targets from a raw value. */
export function extractWikilinkTargets(value: string): string[] {
  WIKILINK_PATTERN.lastIndex = 0;
  const targets: string[] = [];
  for (
    let match = WIKILINK_PATTERN.exec(value);
    match !== null;
    match = WIKILINK_PATTERN.exec(value)
  ) {
    const target = match[1]?.trim();
    if (target) targets.push(target);
  }
  return targets;
}

function extractTargets(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => extractTargets(item));
  }
  if (typeof value !== "string") return [];

  const links = extractWikilinkTargets(value);
  if (links.length > 0) return links;

  const trimmed = value.trim();
  if (!trimmed) return [];
  // Bare scalar values (e.g. `parent:: Some Note`) are treated as link targets.
  if (/^(true|false|null|~|\d+(?:\.\d+)?)$/i.test(trimmed)) return [];
  return [trimmed];
}

const INLINE_BRACKET_FIELD = /\[([A-Za-z][A-Za-z0-9 _-]*)::\s*([^\]]+)\]/g;
const INLINE_LINE_FIELD = /^[ \t>*+-]*([A-Za-z][A-Za-z0-9 _-]*)::[ \t]*(.+)$/gm;
const FENCED_CODE = /```[\s\S]*?```|~~~[\s\S]*?~~~/g;

/** Extract `Field:: value` pairs from the note body (frontmatter excluded). */
export function extractInlineFields(markdown: string): Array<[string, string]> {
  const body = stripFrontmatter(markdown).replace(FENCED_CODE, "");
  const fields: Array<[string, string]> = [];

  for (
    let match = INLINE_BRACKET_FIELD.exec(body);
    match !== null;
    match = INLINE_BRACKET_FIELD.exec(body)
  ) {
    fields.push([match[1] ?? "", (match[2] ?? "").trim()]);
  }

  for (
    let match = INLINE_LINE_FIELD.exec(body);
    match !== null;
    match = INLINE_LINE_FIELD.exec(body)
  ) {
    fields.push([match[1] ?? "", (match[2] ?? "").trim()]);
  }

  return fields;
}

function stripFrontmatter(markdown: string): string {
  if (!markdown.startsWith("---")) return markdown;
  const end = markdown.indexOf("\n---", 3);
  if (end === -1) return markdown;
  const closing = markdown.indexOf("\n", end + 1);
  return closing === -1 ? "" : markdown.slice(closing + 1);
}
