import remarkParse from "remark-parse";
import { unified } from "unified";
import type { InlineTimeline, InlineTimelineEvent } from "./types.js";

type MdastNode = {
  type?: string;
  lang?: unknown;
  value?: unknown;
  children?: MdastNode[];
  data?: Record<string, unknown>;
};

const parser = unified().use(remarkParse);
const ACTIVE_COLORS = new Set([
  "background-modifier-success",
  "background-modifier-error",
  "background-modifier-error-hover",
  "text-accent",
  "text-accent-hover",
  "text-error",
  "text-error-hover",
  "text-selection",
  "interactive-accent",
  "interactive-accent-hover",
  "interactive-success",
]);

export function remarkTimeline() {
  return (tree: unknown): void => {
    visit(tree as MdastNode, (node, parent, index) => {
      if (!parent || index === undefined || node.type !== "code") return;
      if (
        (node.lang !== "timeline" && node.lang !== "timeline-labeled") ||
        typeof node.value !== "string"
      ) {
        return;
      }
      const timeline = parseInlineTimeline(node.lang, node.value);
      if (!timeline) return;
      parent.children ??= [];
      parent.children[index] = timelineNode(timeline);
    });
  };
}

export function parseInlineTimeline(
  language: unknown,
  source: string,
): InlineTimeline | null {
  const parsed = parseOptions(source);
  const events =
    language === "timeline"
      ? parseTimelineEvents(parsed.source)
      : language === "timeline-labeled"
        ? parseLabeledTimelineEvents(parsed.source)
        : null;
  return events && events.length > 0 ? { ...parsed.options, events } : null;
}

function timelineNode(timeline: InlineTimeline): MdastNode {
  return element(
    "timeline",
    "section",
    ["rb-timeline", "rb-timeline--inline"],
    [
      element(
        "timeline-list",
        "ol",
        ["rb-timeline__list"],
        timeline.events.map(eventNode),
      ),
    ],
    {
      dataRrTimeline: "",
      dataRrTimelineLine: timeline.line,
      dataRrTimelineBody: timeline.body,
      dataRrTimelineActiveColor: timeline.activeColor,
    },
  );
}

function eventNode(event: InlineTimelineEvent): MdastNode {
  return element(
    "timeline-event",
    "li",
    ["rb-timeline__item"],
    [
      element(
        "timeline-date",
        "p",
        ["rb-timeline__date"],
        parseInline(event.date),
      ),
      element(
        "timeline-content",
        "article",
        ["rb-timeline__content"],
        [
          element(
            "timeline-title",
            "h3",
            ["rb-timeline__event-title"],
            parseInline(event.title),
          ),
          element(
            "timeline-body",
            "div",
            ["rb-timeline__body"],
            parseMarkdown(event.content),
          ),
        ],
      ),
    ],
  );
}

function element(
  type: string,
  hName: string,
  className: string[],
  children: MdastNode[],
  properties: Record<string, unknown> = {},
): MdastNode {
  return {
    type,
    children,
    data: {
      hName,
      hProperties: {
        ...properties,
        dataRrTimelineRole: type,
        className: className.join(" "),
      },
    },
  };
}

function parseInline(value: string): MdastNode[] {
  const children = parseMarkdown(value);
  return children.length === 1 && children[0].type === "paragraph"
    ? (children[0].children ?? [])
    : [{ type: "text", value }];
}

function parseMarkdown(value: string): MdastNode[] {
  return ((parser.parse(value) as MdastNode).children ?? []) as MdastNode[];
}

function parseOptions(source: string): {
  source: string;
  options: Omit<InlineTimeline, "events">;
} {
  const match = source.match(/^\s*\[([^\]\r\n]*)\]\s*(?:\r?\n|$)/);
  if (!match) return { source, options: {} };
  const options: Omit<InlineTimeline, "events"> = {};
  for (const token of match[1].split(/[\s,]+/)) {
    if (/^line-[2-5]$/.test(token))
      options.line = Number(token.slice(-1)) as 2 | 3 | 4 | 5;
    if (/^body-[2-4]$/.test(token))
      options.body = Number(token.slice(-1)) as 2 | 3 | 4;
    const activeColor = token.match(/^active-color-(.+)$/)?.[1];
    if (activeColor && ACTIVE_COLORS.has(activeColor))
      options.activeColor = activeColor;
  }
  return { source: source.slice(match[0].length), options };
}

function parseTimelineEvents(source: string): InlineTimelineEvent[] | null {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const events: InlineTimelineEvent[] = [];
  let index = 0;
  while (index < lines.length) {
    while (lines[index]?.trim() === "") index += 1;
    if (index === lines.length) break;
    const fields: string[] = [];
    for (let field = 0; field < 3; field += 1) {
      const match = lines[index]?.match(/^\+\s?(.*)$/);
      if (!match) return null;
      fields.push(match[1]);
      index += 1;
      while (field < 2 && lines[index]?.trim() === "") index += 1;
    }
    const body: string[] = [fields[2]];
    while (index < lines.length && !/^\+\s?/.test(lines[index])) {
      body.push(lines[index]);
      index += 1;
    }
    if (!fields[0].trim() || !fields[1].trim()) return null;
    events.push({
      date: fields[0],
      title: fields[1],
      content: trimBlankLines(body).join("\n"),
    });
  }
  return events;
}

function parseLabeledTimelineEvents(
  source: string,
): InlineTimelineEvent[] | null {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const events: InlineTimelineEvent[] = [];
  let index = 0;
  while (index < lines.length) {
    while (lines[index]?.trim() === "") index += 1;
    if (index === lines.length) break;
    const date = lines[index]?.match(/^date:\s*(.*)$/)?.[1];
    if (!date?.trim()) return null;
    index += 1;
    while (lines[index]?.trim() === "") index += 1;
    const title = lines[index]?.match(/^title:\s*(.*)$/)?.[1];
    if (!title?.trim()) return null;
    index += 1;
    while (lines[index]?.trim() === "") index += 1;
    const contentMatch = lines[index]?.match(/^content:\s*(.*)$/);
    if (!contentMatch) return null;
    index += 1;
    const body = [contentMatch[1]];
    while (index < lines.length && !/^date:\s*/.test(lines[index])) {
      body.push(lines[index]);
      index += 1;
    }
    events.push({ date, title, content: trimBlankLines(body).join("\n") });
  }
  return events;
}

function trimBlankLines(lines: string[]): string[] {
  while (lines[0]?.trim() === "") lines.shift();
  while (lines.at(-1)?.trim() === "") lines.pop();
  return lines;
}

function visit(
  node: MdastNode,
  callback: (node: MdastNode, parent?: MdastNode, index?: number) => void,
  parent?: MdastNode,
  index?: number,
): void {
  callback(node, parent, index);
  for (const [childIndex, child] of (node.children ?? []).entries()) {
    visit(child, callback, node, childIndex);
  }
}
