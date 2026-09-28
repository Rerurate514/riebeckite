import { isPublished } from "@riebeckite/core";
import { createRoute } from "honox/factory";
import { FixtureArticle } from "../components/article";
import { config } from "../config";
import { content } from "../content";
import BuildMarker from "../islands/build-marker";

export default createRoute(async (c) => {
  const manifest = await content.getManifest();
  const indexEntry = manifest.bySlug.get("index");
  if (indexEntry && indexEntry.permalink !== "/") {
    return c.redirect(indexEntry.permalink, 308);
  }

  const post = await content.getProcessedContent("index");
  if (!isPublished(config, post?.frontmatter)) {
    return c.notFound();
  }
  c.set("headTags", indexEntry?.headTags ?? []);

  return c.render(
    <>
      <BuildMarker />
      <FixtureArticle
        post={post}
        propertiesHtml={indexEntry?.bodySlots?.properties}
      />
    </>,
  );
});
