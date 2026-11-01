import {
  type InlineFields,
  parseInlineFieldText,
  stripInlineFieldMarkup,
} from "./inline_fields.js";

export type DataviewTask = {
  line: number;
  lineCount: number;
  status: string;
  checked: boolean;
  completed: boolean;
  fullyCompleted: boolean;
  text: string;
  visual: string;
  tags: string[];
  outlinks: string[];
  blockId: string | null;
  section: string | null;
  parent: number | null;
  children: DataviewTask[];
  fields: InlineFields;
};

const FRONTMATTER_START = /^---\s*$/;
const FENCE = /^(`{3,}|~{3,})/;
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const TASK = /^(\s*)(?:[-*+]|\d+[.)])\s+\[(.)\]\s+(.*)$/u;
const BLOCK_ID = /\s+\^([A-Za-z0-9_-]+)\s*$/;
const TAG = /(^|[\s([{"'])#([\p{L}\p{N}_/-]+)/gu;
const WIKILINK = /\[\[([^\]|#]+)/g;

const SHORTHANDS: readonly [RegExp, string][] = [
  [/🗓\uFE0F?\s*(\d{4}-\d{2}-\d{2})/u, "due"],
  [/📅\s*(\d{4}-\d{2}-\d{2})/u, "due"],
  [/✅\s*(\d{4}-\d{2}-\d{2})/u, "completion"],
  [/➕\s*(\d{4}-\d{2}-\d{2})/u, "created"],
  [/🛫\s*(\d{4}-\d{2}-\d{2})/u, "start"],
  [/⏳\s*(\d{4}-\d{2}-\d{2})/u, "scheduled"],
];

/** Extracts Dataview task metadata from Markdown source. */
export function parseDataviewTasks(markdown: string): DataviewTask[] {
  const lines = markdown.split(/\r?\n/);
  const tasks: DataviewTask[] = [];
  const stack: { indent: number; task: DataviewTask }[] = [];
  let fence: string | null = null;
  let section: string | null = null;
  let index = 0;

  if (FRONTMATTER_START.test(lines[0] ?? "")) {
    const end = lines.findIndex(
      (line, position) => position > 0 && FRONTMATTER_START.test(line),
    );
    if (end > 0) index = end + 1;
  }

  for (; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const fenceMatch = FENCE.exec(line.trimStart());
    if (fenceMatch) {
      const marker = fenceMatch[1]?.[0] ?? null;
      if (fence === null) fence = marker;
      else if (marker === fence) fence = null;
      continue;
    }
    if (fence !== null) continue;

    const heading = HEADING.exec(line);
    if (heading) {
      section = (heading[2] ?? "").trim();
      continue;
    }

    const match = TASK.exec(line);
    if (!match) continue;

    const indent = (match[1] ?? "").replace(/\t/g, "  ").length;
    const status = match[2] ?? " ";
    let text = (match[3] ?? "").trim();
    const block = BLOCK_ID.exec(text);
    const blockId = block ? (block[1] ?? null) : null;
    if (block) text = text.slice(0, block.index).trim();

    const fields = parseInlineFieldText(text);
    for (const [pattern, name] of SHORTHANDS) {
      const shorthand = pattern.exec(text);
      if (shorthand && !fields.has(name)) {
        const time = Date.parse(shorthand[1] ?? "");
        if (!Number.isNaN(time)) fields.set(name, new Date(time));
      }
    }

    while (stack.length > 0 && (stack.at(-1)?.indent ?? -1) >= indent) {
      stack.pop();
    }
    const parent = stack.at(-1)?.task ?? null;

    const task: DataviewTask = {
      line: index + 1,
      lineCount: 1,
      status,
      checked: status !== " ",
      completed: status.toLowerCase() === "x",
      fullyCompleted: status.toLowerCase() === "x",
      text,
      visual: stripInlineFieldMarkup(text),
      tags: [...text.matchAll(TAG)].map((tag) => tag[2] ?? ""),
      outlinks: [...text.matchAll(WIKILINK)].map((link) => link[1] ?? ""),
      blockId,
      section,
      parent: parent ? parent.line : null,
      children: [],
      fields,
    };

    parent?.children.push(task);
    tasks.push(task);
    stack.push({ indent, task });
  }

  applyCompletion(tasks);
  return tasks;
}

function applyCompletion(tasks: DataviewTask[]): void {
  for (const task of tasks.toReversed()) {
    task.lineCount =
      1 + task.children.reduce((sum, child) => sum + child.lineCount, 0);
    task.fullyCompleted =
      task.completed && task.children.every((child) => child.fullyCompleted);
  }
}
