import { content } from "virtual:riebeckite/content";
import { resolveRiebeckiteContentRequest } from "@riebeckite/honox/server";
import { PageBody } from "@riebeckite/honox/ui";
import { createRoute } from "honox/factory";

export default createRoute(async (c) => {
  const page = await resolveRiebeckiteContentRequest(c, content);

  if (page.kind === "response") return page.response;

  const html = page.kind === "content" ? page.post.html : page.page.body;

  return c.render(<PageBody html={html ?? ""} />);
});
