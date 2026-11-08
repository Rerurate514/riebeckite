import { escapeHtmlAttribute } from "@riebeckite/core";
import type { PageReactions, ReactionEmoji } from "./types.js";

export const REACTIONS_ATTRIBUTE = "data-rr-reactions";
export const REACTIONS_ROOT_CLASS = "rr-reactions";

export function renderReactions(
  reactions: readonly ReactionEmoji[],
  data: PageReactions,
  className: string,
  ariaLabel: string,
): string {
  const rootClass = className
    ? `${REACTIONS_ROOT_CLASS} ${className}`
    : REACTIONS_ROOT_CLASS;
  const items = reactions
    .map((reaction) => {
      const count = data.counts.find((c) => c.type === reaction.type);
      return renderReactionButton(
        reaction,
        count?.count ?? 0,
        count?.reacted ?? false,
      );
    })
    .join("");

  return (
    `<div class="${escapeHtmlAttribute(rootClass)}" ${REACTIONS_ATTRIBUTE} ` +
    `role="group" aria-label="${escapeHtmlAttribute(ariaLabel)}" ` +
    `data-content-id="${escapeHtmlAttribute(data.contentId)}">` +
    `<ul class="${REACTIONS_ROOT_CLASS}__list">${items}</ul>` +
    `</div>`
  );
}

function renderReactionButton(
  reaction: ReactionEmoji,
  count: number,
  reacted: boolean,
): string {
  const pressed = reacted ? "true" : "false";
  return (
    `<li class="${REACTIONS_ROOT_CLASS}__item">` +
    `<button type="button" class="${REACTIONS_ROOT_CLASS}__button" ` +
    `data-reaction-type="${escapeHtmlAttribute(reaction.type)}" ` +
    `aria-pressed="${pressed}" aria-label="${escapeHtmlAttribute(reaction.label)}">` +
    `<span class="${REACTIONS_ROOT_CLASS}__emoji" aria-hidden="true">${reaction.emoji}</span>` +
    `<span class="${REACTIONS_ROOT_CLASS}__count">${count}</span>` +
    `</button></li>`
  );
}
