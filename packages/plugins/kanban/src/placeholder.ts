export const KANBAN_ATTRIBUTE = "data-rr-kanban";

export function encodeKanbanSource(source: string): string {
  return encodeURIComponent(source);
}

export function decodeKanbanSource(encoded: string): string {
  return decodeURIComponent(encoded);
}

export function createKanbanPlaceholder(source: string): string {
  return `<div ${KANBAN_ATTRIBUTE}="${encodeKanbanSource(source)}"></div>`;
}

export function createKanbanPlaceholderPattern(): RegExp {
  return new RegExp(
    `<div\\b[^>]*\\b${KANBAN_ATTRIBUTE}="([^"]*)"[^>]*>\\s*</div>`,
    "g",
  );
}
