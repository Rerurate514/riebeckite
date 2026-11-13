import { type PluginSiteComponent, resolvePlugins } from "@riebeckite/core";
import { useArticleContext, useSiteContext } from "@riebeckite/ui";
import { resolveReactionsOptions } from "../src/options.js";
import type {
  PageReactions,
  ReactionEmoji,
  ReactionsOptions,
} from "../src/types.js";

export type ReactionsProps = {
  readonly reactions: readonly ReactionEmoji[];
  readonly data: PageReactions;
  readonly className?: string;
  readonly ariaLabel?: string;
  readonly interactive?: boolean;
};

const Reactions = (({
  reactions,
  data,
  className = "rr-reactions",
  ariaLabel = "Reactions",
  interactive = false,
}: Readonly<ReactionsProps>) => {
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
                disabled={!interactive}
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
}) satisfies PluginSiteComponent<ReactionsProps>;

export default Reactions;

export type ArticleReactionsProps = Omit<
  ReactionsProps,
  "reactions" | "data" | "interactive"
>;

export async function ArticleReactions(props: Readonly<ArticleReactionsProps>) {
  const site = useSiteContext();
  const article = useArticleContext();
  const contentId = article?.entry?.contentId;
  if (!site || !contentId) return [];
  const options = findReactionsOptions(site.config.plugins);
  if (!options?.provider) return [];
  const resolved = resolveReactionsOptions(options);
  const data = await resolved.provider.getReactions(contentId);
  return (
    <Reactions
      reactions={resolved.reactions}
      data={data}
      className={props.className ?? resolved.className}
      ariaLabel={props.ariaLabel ?? resolved.ariaLabel}
      interactive={
        resolved.endpoint !== undefined &&
        resolved.resolveVisitorKey !== undefined
      }
    />
  );
}

function findReactionsOptions(
  plugins: readonly { name: string; options?: unknown }[],
): ReactionsOptions | undefined {
  return resolvePlugins([...plugins]).find(
    (plugin) => plugin.name === "reactions",
  )?.options as ReactionsOptions | undefined;
}
