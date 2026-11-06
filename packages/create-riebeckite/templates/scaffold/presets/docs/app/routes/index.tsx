import { ColorModeToggle } from "@riebeckite/plugin-color-mode";
import { DocsSidebar } from "@riebeckite/plugin-docs";
import { SearchBar } from "@riebeckite/plugin-search";
import { Drawer, DrawerTrigger } from "@riebeckite/ui/drawer";
import { createRoute } from "honox/factory";
import HomePage from "../components/home/home";
import { SiteDrawerNavigation, SiteHeader } from "../components/site-header";
import { renderHomeRuntime } from "../lib/home-runtime";

export default createRoute(async (c) => {
  const runtime = await renderHomeRuntime();

  return c.render(
    <>
      <SiteHeader>
        <div data-spa-region="site-header" class="site-header__region">
          <ColorModeToggle />
          <SearchBar class="rr-search-bar--header" />
          <DrawerTrigger
            controls="site-navigation"
            label="Menu"
            icon="menu"
          />
        </div>
      </SiteHeader>
      <main id="main-content" tabindex={-1}>
        <HomePage locale="en" runtime={runtime} />
      </main>
      <Drawer id="site-navigation" label="Navigation">
        <SiteDrawerNavigation />
        <DocsSidebar />
      </Drawer>
    </>
  );
});
