import type { ResolvedKanbanOptions } from "./types.js";

export type KanbanCard = {
  checked: boolean;
  text: string;
};

export type KanbanColumn = {
  name: string;
  cards: KanbanCard[];
};

export type KanbanParseResult = {
  columns: KanbanColumn[];
  fallback: string[];
  problems: string[];
};

const LIST_ITEM = /^\s*[-*+]\s+(.*)$/;
const TASK_MARKER = /^\[([ xX])\]\s*(.*)$/;

export function parseKanban(
  source: string,
  options: ResolvedKanbanOptions,
): KanbanParseResult {
  const columns: KanbanColumn[] = [];
  const fallback: string[] = [];
  const problems: string[] = [];

  const heading = new RegExp(
    `^\\s*${escapeRegExp(options.columnMarker)}\\s+(.+?)\\s*$`,
  );

  let current: KanbanColumn | null = null;

  for (const rawLine of source.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.replace(/\s+$/, "");
    if (line.trim() === "") continue;

    const columnName = line.match(heading)?.[1]?.trim();
    if (columnName) {
      current = { name: columnName, cards: [] };
      columns.push(current);
      continue;
    }

    const item = line.match(LIST_ITEM)?.[1]?.trim();
    if (item !== undefined) {
      if (item === "") {
        fallback.push(line);
        continue;
      }
      const card = parseCard(item);
      if (current) {
        current.cards.push(card);
      } else {
        fallback.push(line);
        problems.push(
          "A card appeared before the first column and was kept in the fallback.",
        );
      }
      continue;
    }

    fallback.push(line);
  }

  if (columns.length === 0) {
    problems.push(
      `No columns were found (expected a line starting with "${options.columnMarker} ").`,
    );
  }

  return { columns, fallback, problems };
}

export function isKanbanNote(frontmatter: unknown): boolean {
  return (
    typeof frontmatter === "object" &&
    frontmatter !== null &&
    Object.hasOwn(frontmatter, "kanban-plugin")
  );
}

export function stripFrontmatter(markdown: string): string {
  return markdown.replace(
    /^\uFEFF?(?:---|\+\+\+)\r?\n[\s\S]*?\r?\n(?:---|\+\+\+)[ \t]*\r?\n?/,
    "",
  );
}

function parseCard(text: string): KanbanCard {
  const task = text.match(TASK_MARKER);
  if (task) {
    return {
      checked: task[1]?.toLowerCase() === "x",
      text: (task[2] ?? "").trim(),
    };
  }
  return { checked: false, text: text.trim() };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
