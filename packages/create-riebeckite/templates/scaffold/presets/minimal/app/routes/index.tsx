import { getEntryLanguage } from "@riebeckite/core";
import { createRoute } from "honox/factory";
import { SiteArticle } from "../components/article";
import { content } from "../content";

export default createRoute(async (c) => {
  const manifest = await content.getManifest();
  const indexEntry = manifest.bySlug.get("index");
  if (indexEntry && indexEntry.permalink !== "/") {
    return c.redirect(indexEntry.permalink, 308);
  }

  const post = await content.getProcessedContent("index");
  if (indexEntry?.publishing?.routable === false) {
    return c.notFound();
  }

  if (indexEntry) {
    c.set("htmlLanguage", getEntryLanguage(indexEntry));
    c.set("headTags", indexEntry.headTags ?? []);
  }

  return c.render(
    <SiteArticle
      post={post}
        bodySlots={indexEntry?.bodySlots}
    />,
  );
});