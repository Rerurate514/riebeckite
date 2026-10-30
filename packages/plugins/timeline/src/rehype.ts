type HastNode = {
  type?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

const ROLE_CLASSES: Record<string, string> = {
  timeline: "rb-timeline rb-timeline--inline",
  "timeline-list": "rb-timeline__list",
  "timeline-event": "rb-timeline__item",
  "timeline-date": "rb-timeline__date",
  "timeline-content": "rb-timeline__content",
  "timeline-title": "rb-timeline__event-title",
  "timeline-body": "rb-timeline__body",
};
const LINES = new Set([2, 3, 4, 5]);
const BODIES = new Set([2, 3, 4]);
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

export function rehypeTimeline() {
  return (tree: unknown): void => {
    visit(tree as HastNode);
  };
}

function visit(node: HastNode): void {
  const properties = node.properties;
  const role = properties?.dataRrTimelineRole;
  if (typeof role === "string" && ROLE_CLASSES[role]) {
    const classes = [ROLE_CLASSES[role]];
    if (role === "timeline") {
      const line = properties?.dataRrTimelineLine;
      const body = properties?.dataRrTimelineBody;
      const activeColor = properties?.dataRrTimelineActiveColor;
      if (typeof line === "number" && LINES.has(line))
        classes.push(`rb-timeline--line-${line}`);
      if (typeof body === "number" && BODIES.has(body))
        classes.push(`rb-timeline--body-${body}`);
      if (typeof activeColor === "string" && ACTIVE_COLORS.has(activeColor))
        classes.push(`rb-timeline--active-color-${activeColor}`);
    }
    properties.className = classes.join(" ");
  }
  for (const child of node.children ?? []) visit(child);
}
