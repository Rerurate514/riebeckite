import { isPublished } from "@riebeckite/core";
import { createRoute } from "honox/factory";
import { config } from "../config";
import { content } from "../content";

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

  return c.render(
    <main>
      <div dangerouslySetInnerHTML={{ __html: post.html ?? "" }} />
    </main>
  );
});
