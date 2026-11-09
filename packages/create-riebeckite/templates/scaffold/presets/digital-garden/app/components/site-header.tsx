import type { ContentManifest } from "@riebeckite/core";
import { ColorModeToggle } from "@riebeckite/plugin-color-mode";
import { SiteNav } from "@riebeckite/plugin-navigation";
import { SearchBar } from "@riebeckite/plugin-search";
import { slugifyTaxonomyValue } from "@riebeckite/plugin-taxonomy";
import { Drawer, DrawerTrigger } from "@riebeckite/ui/drawer";
import { useSiteContext } from "@riebeckite/ui";

function folderNavigation(manifest: ContentManifest) {
  const folders = new Set<string>();
  for (const entry of manifest.discoverableEntries) {
    const [folder] = entry.slug.split("/");
    if (entry.slug.includes("/") && folder) folders.add(folder);
  }
  return [...folders].sort((a, b) => a.localeCompare(b, "en")).map((folder) => ({
    label: folder.replace(/[-_]+/g, " ").replace(/^./, (char) => char.toUpperCase()),
    href: `/folders/${slugifyTaxonomyValue(folder)}`,
  }));
}

export function SiteHeader() {
  const site = useSiteContext();
  const items = site ? folderNavigation(site.manifest) : [];

  return (
    <>
      <header class="site-header rb-site-header">
        <a href="/" class="site-header__home rb-site-header__home">
          <span class="site-header__mark">
            <img
              src="/riebeckite-logo.png"
              alt=""
              class="site-header__logo"
              width="28"
              height="28"
            />
          </span>
          <span class="site-header__title">{site?.config.site.title}</span>
        </a>
        <nav class="site-header__navigation" aria-label="Primary navigation">
          <SiteNav items={items} />
        </nav>
        <div class="site-header__actions">
          <SearchBar class="rr-search-bar--header" />
          <ColorModeToggle />
          <DrawerTrigger
            controls="site-navigation"
            label="Menu"
            icon="menu"
            class="site-header__menu"
          />
        </div>
      </header>
      <Drawer id="site-navigation" label="Navigation">
        <SiteNav items={items} />
        <SiteNav placement="secondary" label="Secondary navigation" />
      </Drawer>
    </>
  );
}

export function SiteFooter() {
  const site = useSiteContext();

  return (
    <footer class="site-footer rb-site-footer">
      <div class="site-footer__inner">
        <div class="site-footer__identity">
          <a href="/" class="site-footer__note">
            {site?.config.site.title}
          </a>
          <p class="site-footer__meta">
            Built with <a href="https://riebeckite.dev">Riebeckite</a>
          </p>
        </div>
        <SiteNav placement="secondary" />
      </div>
    </footer>
  );
}
