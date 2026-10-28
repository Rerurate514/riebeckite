import { initSidebarNavigation } from "@riebeckite/plugin-navigation/client";

type ClientContext = { root?: ParentNode };

export function initDocsSidebar(context: ClientContext = {}) {
  return initSidebarNavigation(context);
}
