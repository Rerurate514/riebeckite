import { config } from "virtual:riebeckite/config";
import { content } from "virtual:riebeckite/content";
import { createPublicContentView } from "@riebeckite/core";
import {
  getThemeStyle,
  getThemeStylesheets,
  PluginHeadTags,
  SeoHead,
  ThemeRoot,
} from "@riebeckite/honox/ui";
import {
  ColorModeScript,
  ColorModeToggle,
} from "@riebeckite/plugin-color-mode";
import { DocsSidebar } from "@riebeckite/plugin-docs";
import { SearchBar } from "@riebeckite/plugin-search";
import { TableOfContents } from "@riebeckite/plugin-toc";
import { SiteProvider } from "@riebeckite/ui";
import { Drawer, DrawerTrigger } from "@riebeckite/ui/drawer";
import { jsxRenderer } from "hono/jsx-renderer";
import { Link, Script } from "honox/server";
import {
  SiteDrawerNavigation,
  SiteFooter,
  SiteHeader as SiteNavigationHeader,
} from "../components/site-navigation";
import { getHreflangAlternates, toOgLocale } from "../lib/locale";
import { buildWebsiteSeo, getHtmlLanguage } from "../lib/seo";

// Plugin client entries are browser capabilities, not HonoX islands. HonoX
// gates its client `<Script>` on this export, so keep the client runtime in
// SSG output even when a page has no island component.
export const __importing_islands = true;

export default jsxRenderer(async ({ children }, c) => {
  const { site } = config;
  const headTags = c.get("headTags") ?? [];
  const htmlLanguage = c.get("htmlLanguage") ?? getHtmlLanguage();
  const ogLocale = toOgLocale(c.get("htmlLanguage") ?? site.locale);
  const ogAlternates = getHreflangAlternates(headTags)
    .map((language) => toOgLocale(language))
    .filter((locale) => locale !== ogLocale);
  const manifest = await content.getRequestManifest();
  const seo =
    c.get("seo") ??
    buildWebsiteSeo(
      {
        title: site.title,
        description: site.description,
        path: c.req.path,
      },
      headTags,
    );
  const themeStyle = getThemeStyle(config.theme);
  const shell = c.get("shell");
  const tocItems = c.get("tocItems");

  return (
    <SiteProvider
      config={config}
      manifest={manifest}
      view={createPublicContentView(manifest)}
      path={c.req.path}
      language={htmlLanguage}
      headTags={headTags}
    >
      <ThemeRoot>
        <head>
          <meta charset="utf-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <PluginHeadTags tags={headTags} />
          <link rel="icon" href="/favicon.ico" />
          <SeoHead
            seo={seo}
            siteTitle={site.title}
            author={site.author}
            ogLocale={ogLocale}
            ogAlternates={ogAlternates}
            twitterSite={site.twitterSite}
            feedLinks={[
              { href: "/feed.xml", type: "application/rss+xml" },
              { href: "/atom.xml", type: "application/atom+xml" },
              { href: "/feed.json", type: "application/feed+json" },
            ]}
          />
          <ColorModeScript />
          <Link href="/app/style.css" rel="stylesheet" />
          {themeStyle ? (
            <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
          ) : null}
          {getThemeStylesheets(config.theme.stylesheets).map((href) => (
            <link href={href} rel="stylesheet" key={href} />
          ))}
          <Script src="/app/client.ts" async />
        </head>
        <body class="riebeckite-page rb-site">
          <ColorModeToggle placement="floating" />
          {shell === "docs" ? (
            <>
              <div class="site-shell site-shell--docs">
                <SiteNavigationHeader>
                  <div
                    data-spa-region="site-header"
                    class="site-header__region"
                  >
                    <ColorModeToggle />
                    <SearchBar class="rr-search-bar--header" />
                    <DrawerTrigger
                      controls="docs-navigation"
                      label="Menu"
                      icon="menu"
                    />
                  </div>
                </SiteNavigationHeader>
                <div class="site-layout">
                  <aside class="site-sidebar" aria-label="Documentation">
                    <div data-spa-region="docs-navigation">
                      <DocsSidebar />
                    </div>
                  </aside>
                  <main id="main-content" tabindex={-1} class="site-main">
                    <div class="site-content">{children}</div>
                  </main>
                  <aside class="site-aside" aria-label="Table of contents">
                    <div data-spa-region="toc">
                      <TableOfContents
                        className="rr-table-of-contents--desktop"
                        items={tocItems}
                      />
                    </div>
                  </aside>
                </div>
                <Drawer id="docs-navigation" label="Documentation">
                  <div data-spa-region="docs-navigation-mobile">
                    <SiteDrawerNavigation />
                    <DocsSidebar />
                  </div>
                </Drawer>
              </div>
              <div data-spa-region="site-footer">
                <SiteFooter />
              </div>
            </>
          ) : (
            <>
              <SiteNavigationHeader>
                <div data-spa-region="site-header" class="site-header__region">
                  <SearchBar class="rr-search-bar--header" />
                  <ColorModeToggle />
                  <DrawerTrigger
                    controls="site-navigation"
                    label="Menu"
                    icon="menu"
                  />
                </div>
              </SiteNavigationHeader>
              <Drawer id="site-navigation" label="Navigation">
                <div data-spa-region="site-navigation">
                  <SiteDrawerNavigation />
                </div>
              </Drawer>
              <main id="main-content" tabindex={-1}>
                {children}
              </main>
              <div data-spa-region="site-footer">
                <SiteFooter />
              </div>
            </>
          )}
        </body>
      </ThemeRoot>
    </SiteProvider>
  );
});
