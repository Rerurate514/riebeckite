import type {
  ContentManager,
  ContentManifestEntry,
  PostContent,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import { createPublicContentView } from "@riebeckite/core";
import { createRoute } from "honox/factory";
import type { Context } from "hono";
import type { Child } from "hono/jsx";
import {
  contentRouteSsgParams,
  riebeckiteSsgParams,
  resolveRiebeckiteContentRequest,
  resolveRiebeckiteHomeRequest,
} from "./content_route.js";
import { ArticleProvider, SiteProvider } from "./ui/context.js";
import { PageBody } from "./ui/primitives.js";

type RouteContent = Pick<
  ContentManager,
  | "resolvePage"
  | "getManifest"
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
    contentRouteSsgParams(path, () => riebeckiteSsgParams(options.content, parameter)),
    async (c) => {
      const resolved = await resolveRiebeckiteContentRequest(
        c,
        options.content,
        parameter,
      );
      if (resolved.kind === "response") return resolved.response;
      if (resolved.kind === "page") return c.render(<PageBody html={resolved.page.body} />);
      return renderContent(c, options, resolved.entry, resolved.post);
    },
  );
}

export function createHomeRoute(options: HomeRouteOptions) {
  return createRoute(async (c) => {
    const resolved = await resolveRiebeckiteHomeRequest(c, options.content);
    if (resolved.kind === "response") return resolved.response;
    if (resolved.kind === "page") return c.render(<PageBody html={resolved.page.body} />);
    return renderContent(c, options, resolved.entry, resolved.post);
  });
}

async function renderContent(
  c: Context,
  options: Pick<ContentRouteOptions, "content" | "config" | "render">,
  entry: ContentManifestEntry,
  post: PostContent,
): Promise<Response> {
  const manifest = await options.content.getManifest();
  const view = createPublicContentView(manifest);
  const publicEntry = view.findRoutableBySlug(entry.slug);
  if (!publicEntry) return c.notFound();
  return c.render(
    <SiteProvider config={options.config} manifest={manifest} view={view} path={c.req.path}>
      <ArticleProvider entry={publicEntry} post={post}>
        {options.render({ entry, post })}
      </ArticleProvider>
    </SiteProvider>,
  );
}
