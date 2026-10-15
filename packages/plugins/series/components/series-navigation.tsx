import type { PluginComponent } from "@riebeckite/core";
import type { SeriesIndex } from "../src/types.js";

export type SeriesNavigationProps = {
  index: SeriesIndex | null;
  currentSlug: string;
  className?: string;
};
const SeriesNavigation = (({
  index,
  currentSlug,
  className = "rb-series",
}: Readonly<SeriesNavigationProps>) => {
  if (!index || index.members.length === 0) return null;
  return (
    <nav
      class={className}
      data-series={index.name}
      aria-label="Series navigation"
    >
      <p class={`${className}__title`}>{index.title}</p>
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
    </nav>
  );
}) satisfies PluginComponent<SeriesNavigationProps>;
export default SeriesNavigation;
