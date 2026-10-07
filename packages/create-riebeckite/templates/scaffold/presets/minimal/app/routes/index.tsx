import { resolveRiebeckiteHomeRequest } from "@riebeckite/honox/server";
import { PageBody } from "@riebeckite/honox/ui";
import { createRoute } from "honox/factory";
import { SiteArticle } from "../components/article";
import { content } from "virtual:riebeckite/content";

export default createRoute(async (c) => {
  const home = await resolveRiebeckiteHomeRequest(c, content);

  if (home.kind === "response") return home.response;

  if (home.kind === "page") {
    return c.render(<PageBody html={home.page.body} />);
  }

  return c.render(
    <SiteArticle post={home.post} bodySlots={home.entry.bodySlots} />,
  );
});
