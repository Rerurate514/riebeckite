import type {
  ContentManager,
  ContentManifestEntry,
  PostContent,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import { createPublicContentView } from "@riebeckite/core";
import type { Context } from "hono";
import type { Child } from "hono/jsx";
import { createRoute } from "honox/factory";
import {
  contentRouteSsgParams,
  type ResolvedContentRequest,
  resolveRiebeckiteContentRequest,
  resolveRiebeckiteHomeRequest,
  riebeckiteSsgParams,
} from "./content_route.js";
import { ArticleProvider } from "./ui/context.js";
import { PageBody } from "./ui/primitives.js";

type RouteContent = Pick<
  ContentManager,
  | "resolvePage"
  | "getManifest"
  | "getRequestManifest"
  | "getProcessedContent"
  | "getOutputChangeSet"
  | "getPagePaths"
>;

type RenderContent = (content: {
  entry: ContentManifestEntry;
  post: PostContent;
}) => Child;

export type ContentRouteOptions = {
  content: RouteContent;
  config: ResolvedRiebeckiteConfig;
  render: RenderContent;
  path?: string;
  parameter?: string;
};

export type HomeRouteOptions = Omit<ContentRouteOptions, "path" | "parameter">;

export function createContentRoute(options: ContentRouteOptions) {
  const path = options.path ?? "/:slug{.+}";
  const parameter = options.parameter ?? "slug";
  return createRoute(
    contentRouteSsgParams(path, () =>
      riebeckiteSsgParams(options.content, parameter),
    ),
    async (c) => {
      const resolved = await resolveRiebeckiteContentRequest(
        c,
        options.content,
        parameter,
      );
      if (resolved.kind === "response") return resolved.response;
      applySeoContext(c, options.config, resolved);
      if (resolved.kind === "page")
        return c.render(<PageBody html={resolved.page.body} />);
      return renderContent(c, options, resolved.entry, resolved.post);
    },
  );
}

export function createHomeRoute(options: HomeRouteOptions) {
  return createRoute(async (c) => {
    const resolved = await resolveRiebeckiteHomeRequest(c, options.content);
    if (resolved.kind === "response") return resolved.response;
    applySeoContext(c, options.config, resolved);
    if (resolved.kind === "page")
      return c.render(<PageBody html={resolved.page.body} />);
    return renderContent(c, options, resolved.entry, resolved.post);
  });
}

function applySeoContext(
  c: Context,
  config: ResolvedRiebeckiteConfig,
  resolved: Exclude<ResolvedContentRequest, { kind: "response" }>,
): void {
  const provider = config.plugins.find((plugin) => plugin.seo)?.seo;
  if (!provider) return;
  if (resolved.kind === "content") {
    c.set(
      "seo",
      provider.buildArticleSeo(
        config,
        resolved.entry.permalink,
        resolved.post,
        c.get("headTags"),
        c.get("htmlLanguage"),
      ),
    );
    return;
  }
  c.set(
    "seo",
    provider.buildWebsiteSeo(
      config,
      {
        title: resolved.page.title ?? config.site.title,
        description: resolved.page.description,
        path: resolved.page.pathname,
      },
      resolved.page.headTags,
      resolved.page.language,
    ),
  );
}

async function renderContent(
  c: Context,
  options: Pick<ContentRouteOptions, "content" | "config" | "render">,
  entry: ContentManifestEntry,
  post: PostContent,
): Promise<Response> {
  const manifest = await options.content.getRequestManifest();
  const view = createPublicContentView(manifest);
  const publicEntry = view.findRoutableBySlug(entry.slug);
  if (!publicEntry) return c.notFound();
  return c.render(
    <ArticleProvider entry={publicEntry} post={post}>
      {options.render({ entry, post })}
    </ArticleProvider>,
  );
}
