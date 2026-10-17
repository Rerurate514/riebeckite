import { Backlinks as BacklinksComponent, getBacklinks, type BacklinksProps } from "@riebeckite/plugin-backlinks";
import { Breadcrumbs as BreadcrumbsComponent, getBreadcrumbs, type BreadcrumbsProps } from "@riebeckite/plugin-breadcrumbs";
import { DailyNotes as DailyNotesComponent, getDailyNotes, type DailyNote } from "@riebeckite/plugin-daily-notes";
import { Properties as PropertiesComponent, getProperties, type PropertiesData, type PropertiesOptions } from "@riebeckite/plugin-properties";
import { RecentPosts as RecentPostsComponent, getRecentPosts, type RecentPost } from "@riebeckite/plugin-recent-posts";
import { getRelatedPosts, RelatedPosts as RelatedPostsComponent, resolveRelatedPostsOptions, type RelatedPostsEntry, type RelatedPostsOptions, type ResolvedRelatedPostsOptions } from "@riebeckite/plugin-related-posts";
import { getShareLinks, ShareControls as ShareControlsComponent, type ShareLinksData, type ShareOptions } from "@riebeckite/plugin-share";
import { extractTableOfContents, TableOfContents as TableOfContentsComponent, type TableOfContentsItem } from "@riebeckite/plugin-toc";
import { useArticleContext, useSiteContext } from "./context.js";

export async function Backlinks(props: Partial<BacklinksProps> = {}) {
  const site = useSiteContext();
  const article = useArticleContext();
  const backlinks = props.backlinks ?? (site && article?.entry ? await getBacklinks({ view: site.view, slug: article.entry.slug }) : undefined);
  return backlinks ? <BacklinksComponent backlinks={backlinks} /> : null;
}

export async function Breadcrumbs(props: Partial<BreadcrumbsProps> = {}) {
  const site = useSiteContext();
  const article = useArticleContext();
  const items = props.items ?? (site && article?.entry ? await getBreadcrumbs({ view: site.view, entry: article.entry, homeLabel: site.config.site.title }) : undefined);
  return items ? <BreadcrumbsComponent {...props} items={items} /> : null;
}

export async function Properties(props: { data?: PropertiesData; options?: PropertiesOptions } = {}) {
  const site = useSiteContext();
  const article = useArticleContext();
  const data = props.data ?? (site && article ? await getProperties({ view: site.view, frontmatter: article.post.frontmatter, options: props.options }) : undefined);
  return data ? <PropertiesComponent data={data} /> : null;
}

export async function RelatedPosts(props: { entries?: readonly RelatedPostsEntry[]; options?: RelatedPostsOptions | ResolvedRelatedPostsOptions } = {}) {
  const site = useSiteContext();
  const article = useArticleContext();
  const options = resolveRelatedPostsOptions(props.options);
  const entries = props.entries ?? (site && article?.entry ? await getRelatedPosts({ view: site.view, entry: article.entry, options }) : undefined);
  return entries ? <RelatedPostsComponent entries={entries} options={options} /> : null;
}

export function TableOfContents(props: { items?: TableOfContentsItem[]; className: string }) {
  const article = useArticleContext();
  const items = props.items ?? (article ? extractTableOfContents(article.post.html ?? "") : undefined);
  return items ? <TableOfContentsComponent {...props} items={items} /> : null;
}

export async function ShareControls(props: Partial<ShareLinksData> & { options?: ShareOptions } = {}) {
  const site = useSiteContext();
  const article = useArticleContext();
  const data = props.links ? { ...props, links: props.links } : (site && article?.entry ? await getShareLinks({ entry: article.entry, site: site.config, options: props.options }) : undefined);
  return data ? <ShareControlsComponent {...data} /> : null;
}

export function RecentPosts(props: { posts?: RecentPost[]; limit?: number } = {}) {
  const site = useSiteContext();
  const posts = props.posts ?? (site ? getRecentPosts({ manifest: site.manifest, limit: props.limit }) : undefined);
  return posts ? <RecentPostsComponent posts={posts} /> : null;
}

export function DailyNotes(props: { notes?: DailyNote[]; limit?: number } = {}) {
  const site = useSiteContext();
  const notes = props.notes ?? (site ? getDailyNotes({ manifest: site.manifest, config: site.config }) : undefined);
  return notes ? <DailyNotesComponent notes={notes} limit={props.limit} /> : null;
}
