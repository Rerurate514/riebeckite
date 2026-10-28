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
import {
  ContentContainer,
  ShellAside,
  ShellBody,
  ShellContainer,
  ShellDrawer,
  ShellHeader,
  ShellMain,
  ShellSidebar,
  SiteShell,
} from "@riebeckite/shell-ui";
import { SiteProvider } from "@riebeckite/ui";
import { jsxRenderer } from "hono/jsx-renderer";
import { Link, Script } from "honox/server";
import {
  SiteDrawerNavigation,
  SiteFooter,
  SiteHeader,
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
  const manifest = await content.getManifest();
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
              <SiteShell>
                <ShellHeader sticky>
                  <ShellContainer>
                    <div data-spa-region="site-header">
                      <SiteHeader>
                        <ColorModeToggle />
                        <SearchBar class="rr-search-bar--header" />
                        <ShellDrawer label="Menu" icon="menu">
                          <SiteDrawerNavigation />
                          <DocsSidebar />
                        </ShellDrawer>
                      </SiteHeader>
                    </div>
                  </ShellContainer>
                </ShellHeader>
                <ShellBody>
                  <ShellSidebar>
                    <div data-spa-region="docs-navigation">
                      <DocsSidebar />
                    </div>
                  </ShellSidebar>
                  <ShellMain id="main-content" tabindex={-1}>
                    <ContentContainer>{children}</ContentContainer>
                  </ShellMain>
                  <ShellAside>
                    <div data-spa-region="toc">
                      <TableOfContents
                        className="rr-table-of-contents--desktop"
                        items={tocItems}
                      />
                    </div>
                  </ShellAside>
                </ShellBody>
              </SiteShell>
              <div data-spa-region="site-footer">
                <SiteFooter />
              </div>
            </>
          ) : (
            <>
              <div data-spa-region="site-header">
                <SiteHeader>
                  <SearchBar class="rr-search-bar--header" />
                  <ColorModeToggle />
                  <ShellDrawer label="Menu" icon="menu">
                    <SiteDrawerNavigation />
                  </ShellDrawer>
                </SiteHeader>
              </div>
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
