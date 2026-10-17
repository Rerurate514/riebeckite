import { createContentRoute } from "@riebeckite/honox/server";
import { SiteArticle } from "../components/article";
import { config } from "virtual:riebeckite/config";
import { content } from "virtual:riebeckite/content";

export default createContentRoute({
  content,
  config,
  render: () => <SiteArticle />,
});
