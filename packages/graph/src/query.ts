import type { GraphNode } from "./types.js";

export type GraphQueryField = "text" | "file" | "path" | "tag" | "unsupported";

export type GraphQueryTerm = {
  field: GraphQueryField;
  value: string;
  negated: boolean;
};

export type ParsedGraphQuery = {
  terms: GraphQueryTerm[];
  unsupportedOperators: string[];
};

const SUPPORTED_OPERATORS = new Set(["file", "path", "tag"]);
const TOKEN_PATTERN = /"[^"]*"|\S+/g;

export function parseGraphQuery(input: string): ParsedGraphQuery {
  const terms: GraphQueryTerm[] = [];
  const unsupportedOperators = new Set<string>();

  for (const rawToken of input.match(TOKEN_PATTERN) ?? []) {
    let token = rawToken.trim();
    if (token.length === 0) continue;

    let negated = false;
    if (token.startsWith("-") && token.length > 1) {
      negated = true;
      token = token.slice(1);
    }

    const separator = token.indexOf(":");
    if (separator > 0) {
      const operator = token.slice(0, separator).toLocaleLowerCase();
      if (!/^[a-z]+$/.test(operator)) {
        terms.push({ field: "text", value: unquote(token), negated });
        continue;
      }
      if (!SUPPORTED_OPERATORS.has(operator)) {
        unsupportedOperators.add(operator);
        terms.push({
          field: "unsupported",
          value: unquote(token.slice(separator + 1)),
          negated,
        });
        continue;
      }
      terms.push({
        field: operator as "file" | "path" | "tag",
        value: normalizeTagValue(unquote(token.slice(separator + 1))),
        negated,
      });
      continue;
    }

    terms.push({ field: "text", value: unquote(token), negated });
  }

  return { terms, unsupportedOperators: [...unsupportedOperators] };
}

export function matchesGraphQuery(
  node: GraphNode,
  query: ParsedGraphQuery,
): boolean {
  for (const term of query.terms) {
    const matched = matchesTerm(node, term);
    if (term.negated ? matched : !matched) return false;
  }
  return true;
}

export function normalizeGraphText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[ァ-ン]/g, (character) =>
      String.fromCharCode(character.charCodeAt(0) - 0x60),
    );
}

function matchesTerm(node: GraphNode, term: GraphQueryTerm): boolean {
  const value = normalizeGraphText(term.value);
  if (value.length === 0) return false;

  switch (term.field) {
    case "file":
      return normalizeGraphText(node.title).includes(value);
    case "path":
      return normalizeGraphText(node.path).includes(value);
    case "tag":
      return node.tags.some((tag) => {
        const normalized = normalizeGraphText(tag);
        return normalized === value || normalized.startsWith(`${value}/`);
      });
    case "text":
      return (
        normalizeGraphText(node.title).includes(value) ||
        normalizeGraphText(node.path).includes(value) ||
        node.tags.some((tag) => normalizeGraphText(tag).includes(value))
      );
    case "unsupported":
      return false;
  }
}

function normalizeTagValue(value: string): string {
  return value.replace(/^#+/, "");
}

function unquote(value: string): string {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  return value;
}
