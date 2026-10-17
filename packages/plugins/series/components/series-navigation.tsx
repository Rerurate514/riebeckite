import type { PluginComponent } from "@riebeckite/core";
import { useArticleContext, useSiteContext } from "@riebeckite/ui";
import { collectSeriesIndexes, getSeriesNavigation } from "../src/series.js";
import type {
  ResolvedSeriesOptions,
  SeriesIndex,
  SeriesOptions,
} from "../src/types.js";

export type SeriesNavigationProps = {
  index?: SeriesIndex | null;
  currentSlug?: string;
  className?: string;
  options?: Pick<ResolvedSeriesOptions, "heading" | "positionLabel">;
};
const SeriesNavigation = (async ({
  index: explicitIndex,
  currentSlug: explicitCurrentSlug,
  className: explicitClassName,
  options,
}: Readonly<SeriesNavigationProps>) => {
  const site = useSiteContext();
  const article = useArticleContext();
  const configured = site ? findSeriesOptions(site.config.plugins) : undefined;
  const currentSlug = explicitCurrentSlug ?? article?.entry?.slug;
  const sourceIndex =
    explicitIndex ??
    (site && article?.entry
      ? (collectSeriesIndexes(site.manifest, configured).find((candidate) =>
          candidate.members.some(
            (member) => member.slug === article.entry?.slug,
          ),
        ) ?? null)
      : null);
  const index =
    site && article?.entry && sourceIndex
      ? await getSeriesNavigation({
          view: site.view,
          entry: article.entry,
          index: sourceIndex,
        })
      : sourceIndex;
  if (!currentSlug) return [];
  if (!index || index.members.length === 0) return [];
  const position = index.members.findIndex(
    (member) => member.slug === currentSlug,
  );
  const previous = position > 0 ? index.members[position - 1] : undefined;
  const next =
    position >= 0 && position < index.members.length - 1
      ? index.members[position + 1]
      : undefined;
  const heading = options?.heading ?? configured?.heading ?? true;
  const positionLabel =
    options?.positionLabel ?? configured?.positionLabel ?? false;
  const className = explicitClassName ?? configured?.className ?? "rb-series";
  return (
    <nav
      class={className}
      data-series={index.name}
      aria-label="Series navigation"
    >
      {heading ? (
        <p class={`${className}__title`}>
          <a class={`${className}__link`} href={index.members[0].permalink}>
            {index.title}
          </a>
          {positionLabel && position >= 0 ? (
            <span class={`${className}__position`}>
              {` Part ${position + 1} of ${index.members.length}`}
            </span>
          ) : null}
        </p>
      ) : null}
      <ol class={`${className}__list`}>
        {index.members.map((member) => (
          <li class={`${className}__item`} key={member.slug}>
            <a
              class={`${className}__link`}
              href={member.permalink}
              aria-current={member.slug === currentSlug ? "page" : undefined}
            >
              {member.title}
            </a>
          </li>
        ))}
      </ol>
      <div class={`${className}__nav`}>
        {previous ? (
          <a class={`${className}__prev`} href={previous.permalink} rel="prev">
            ← {previous.title}
          </a>
        ) : null}
        {next ? (
          <a class={`${className}__next`} href={next.permalink} rel="next">
            {next.title} →
          </a>
        ) : null}
      </div>
    </nav>
  );
}) satisfies PluginComponent<SeriesNavigationProps>;
export default SeriesNavigation;

function findSeriesOptions(
  plugins: readonly { name: string; options?: unknown }[],
): SeriesOptions | undefined {
  return plugins.find((plugin) => plugin.name === "series")?.options as
    | SeriesOptions
    | undefined;
}
