import { createHomeRoute } from "@riebeckite/honox/server";
import { SiteHome } from "../components/home";
import { config } from "virtual:riebeckite/config";
import { content } from "virtual:riebeckite/content";

export default createHomeRoute({
  content,
  config,
  render: () => <SiteHome />,
});
