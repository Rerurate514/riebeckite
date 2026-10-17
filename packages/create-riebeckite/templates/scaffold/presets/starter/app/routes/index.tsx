import { createHomeRoute } from "@riebeckite/honox/server";
import { SiteArticle } from "../components/article";
import { config } from "virtual:riebeckite/config";
import { content } from "virtual:riebeckite/content";

export default createHomeRoute({
  content,
  config,
  render: () => <SiteArticle />,
});
