import { ArticleBody } from "@riebeckite/honox/ui";
import { buildTaxonomyTagHref } from "@riebeckite/plugin-taxonomy";
import { useSiteContext } from "@riebeckite/ui";
import { formatPostDate } from "../lib/date";

export function SiteHome() {
  const site = useSiteContext();
  if (!site) return null;
  const posts = site.view.discoverableEntries
    .filter((entry) => entry.permalink !== "/")
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  const descriptions = new Map(
    site.manifest.entries.map((entry) => [
      entry.slug,
      typeof entry.frontmatter.description === "string"
        ? entry.frontmatter.description
        : "",
    ]),
  );

  return (
    <div class="site-home">
      <div class="site-home__intro">
        <ArticleBody />
      </div>
      {posts.length > 0 ? (
        <section class="site-home__feed" aria-labelledby="site-home-feed">
          <h2 class="site-home__feed-title" id="site-home-feed">
            Latest posts
          </h2>
          <ol class="site-home__list">
            {posts.map((post) => {
              const description = descriptions.get(post.slug);
              const date = formatPostDate(post.date, site.language);
              return (
                <li class="site-home__post" key={post.slug}>
                  <h3 class="site-home__post-title">
                    <a href={post.permalink}>{post.title}</a>
                  </h3>
                  {description ? (
                    <p class="site-home__description">{description}</p>
                  ) : null}
                  <div class="site-home__meta">
                    {date && post.date ? (
                      <time class="site-home__date" dateTime={post.date}>
                        {date}
                      </time>
                    ) : null}
                    {post.tags.length > 0 ? (
                      <ul class="site-home__tags" aria-label="Tags">
                        {post.tags.map((tag) => (
                          <li key={tag}>
                            <a href={buildTaxonomyTagHref(tag, "/tags")}>
                              #{tag}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
