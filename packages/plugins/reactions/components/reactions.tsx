import type { PageReactions, ReactionEmoji } from "../src/types.js";

export type ReactionsProps = {
  reactions: readonly ReactionEmoji[];
  data: PageReactions;
  className?: string;
  ariaLabel?: string;
};

export default function Reactions({
  reactions,
  data,
  className = "rr-reactions",
  ariaLabel = "Reactions",
}: ReactionsProps) {
  return (
    <fieldset
      class={className}
      data-rr-reactions
      aria-label={ariaLabel}
      data-content-id={data.contentId}
    >
      <ul class="rr-reactions__list">
        {reactions.map((reaction) => {
          const count = data.counts.find((c) => c.type === reaction.type);
          const reacted = count?.reacted ?? false;
          return (
            <li class="rr-reactions__item">
              <button
                type="button"
                class="rr-reactions__button"
                data-reaction-type={reaction.type}
                aria-pressed={reacted ? "true" : "false"}
                aria-label={reaction.label}
              >
                <span class="rr-reactions__emoji" aria-hidden="true">
                  {reaction.emoji}
                </span>
                <span class="rr-reactions__count">{count?.count ?? 0}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
