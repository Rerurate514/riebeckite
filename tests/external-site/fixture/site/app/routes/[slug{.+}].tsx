import { content } from "virtual:riebeckite/content";
import { createPublicContentView } from "@riebeckite/core";
import {
  contentRouteSsgParams,
  resolveRiebeckiteContentRequest,
  riebeckiteSsgParams,
} from "@riebeckite/honox/server";
import { PageBody } from "@riebeckite/honox/ui";
import { getProperties, Properties } from "@riebeckite/plugin-properties";
import {
  getRelatedPosts,
  RelatedPosts,
  resolveRelatedPostsOptions,
} from "@riebeckite/plugin-related-posts";
import {
  buildSeriesIndex,
  getSeriesNavigation,
  SeriesNavigation,
} from "@riebeckite/plugin-series";
import { createRoute } from "honox/factory";
import { FixtureArticle } from "../components/article";

export default createRoute(
  contentRouteSsgParams("/:slug{.+}", () => riebeckiteSsgParams(content)),
  async (c) => {
    const resolved = await resolveRiebeckiteContentRequest(c, content);

    if (resolved.kind === "response") return resolved.response;

    if (resolved.kind === "page") {
      return c.render(<PageBody html={resolved.page.body} />);
    }

    const manifest = await content.getManifest();
    const view = createPublicContentView(manifest);
    const entry = view.findRoutableBySlug(resolved.entry.slug);
    if (!entry) return c.notFound();

    const properties = await getProperties({
      view,
      frontmatter: resolved.post.frontmatter,
    });
    const relatedPostsOptions = resolveRelatedPostsOptions({});
    const relatedPosts = await getRelatedPosts({
      view,
      entry,
      options: relatedPostsOptions,
    });
    const seriesName = resolved.entry.frontmatter.series;
    const seriesNavigation =
      typeof seriesName === "string"
        ? await getSeriesNavigation({
            view,
            entry,
            index: await buildSeriesIndex(manifest, seriesName),
          })
        : null;
    return c.render(
      <FixtureArticle
        post={resolved.post}
        metadata={<Properties data={properties} />}
        footer={
          <>
            <RelatedPosts
              entries={relatedPosts}
              options={relatedPostsOptions}
            />
            <SeriesNavigation
              index={seriesNavigation}
              currentSlug={entry.slug}
            />
          </>
        }
      />,
    );
  },
);
