import { REACTIONS_ATTRIBUTE, REACTIONS_ROOT_CLASS } from "./render.js";
import type { PageReactions, ReactionType } from "./types.js";

type ReactionsClientConfig = { endpoint: string };

export function initReactions(config: ReactionsClientConfig): void {
  if (typeof document === "undefined") return;
  for (const root of document.querySelectorAll<HTMLElement>(
    `[${REACTIONS_ATTRIBUTE}]`,
  )) {
    if (root.dataset.rrReactionsReady === "true") continue;
    root.dataset.rrReactionsReady = "true";
    void refresh(root, config.endpoint);
    root.addEventListener("click", (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>(
        "[data-reaction-type]",
      );
      if (!button || button.disabled) return;
      void toggle(root, button, config.endpoint);
    });
  }
}

async function refresh(root: HTMLElement, endpoint: string): Promise<void> {
  const contentId = root.dataset.contentId;
  if (!contentId) return;
  try {
    const response = await fetch(
      `${endpoint}?contentId=${encodeURIComponent(contentId)}`,
    );
    if (!response.ok) return;
    update(root, (await response.json()) as PageReactions);
  } catch {}
}

async function toggle(
  root: HTMLElement,
  button: HTMLButtonElement,
  endpoint: string,
): Promise<void> {
  const contentId = root.dataset.contentId;
  const type = button.dataset.reactionType as ReactionType | undefined;
  if (!contentId || !type) return;
  button.disabled = true;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentId,
        type,
        action:
          button.getAttribute("aria-pressed") === "true" ? "remove" : "add",
      }),
    });
    if (response.ok) update(root, (await response.json()) as PageReactions);
  } catch {
  } finally {
    button.disabled = false;
  }
}

function update(root: HTMLElement, data: PageReactions): void {
  for (const count of data.counts) {
    const button = root.querySelector<HTMLButtonElement>(
      `[data-reaction-type="${count.type}"]`,
    );
    if (!button) continue;
    button.disabled = false;
    button.setAttribute("aria-pressed", String(count.reacted));
    const countElement = button.querySelector(
      `.${REACTIONS_ROOT_CLASS}__count`,
    );
    if (countElement) countElement.textContent = String(count.count);
  }
}
