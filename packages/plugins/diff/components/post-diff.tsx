import { type PluginComponent, resolvePlugins } from "@riebeckite/core";
import { useArticleContext, useSiteContext } from "@riebeckite/ui";
import { createPostDiffApi, type DiffPluginOptions } from "../index.js";
import type { PostDiff as PostDiffData } from "../src/types.js";

export type PostDiffProps = {
  readonly diff: PostDiffData | null;
  readonly title?: string;
};

const PostDiff = (({ diff, title = "History" }: Readonly<PostDiffProps>) => {
  if (!diff) return null;
  return (
    <section class="rr-diff-history" data-rr-diff-history>
      <h2 class="rr-diff-history__title">{title}</h2>
      <p class="rr-diff-history__meta">
        {diff.from ? `${diff.from.shortHash} → ` : ""}
        {diff.to.shortHash}
      </p>
      <pre class="rr-diff-history__diff">
        <code>
          {diff.lines.map((line, index) => (
            <span
              class={`rr-diff-line rr-diff-line--${line.type}`}
              key={`${line.oldLineNumber}-${line.newLineNumber}-${index}`}
            >
              {line.type === "added"
                ? "+"
                : line.type === "removed"
                  ? "-"
                  : " "}
              {line.content}
              {"\n"}
            </span>
          ))}
        </code>
      </pre>
    </section>
  );
}) satisfies PluginComponent<PostDiffProps>;

export default PostDiff;

export type ArticlePostDiffProps = Omit<PostDiffProps, "diff">;

export async function ArticlePostDiffView(
  props: Readonly<ArticlePostDiffProps>,
) {
  const site = useSiteContext();
  const article = useArticleContext();
  if (!site || !article?.entry) return <></>;
  const options = findDiffOptions(site.config.plugins);
  if (!options || options.ui?.enabled === false) return <></>;
  const filePath =
    site.manifest.contentIndex.get(article.entry.slug.toLowerCase()) ??
    `${article.entry.slug}.md`;
  const diff = await createPostDiffApi({
    ...options,
    cwd: options.cwd ?? site.config.content.directory,
  }).getCurrentDiff(filePath);
  return <PostDiff diff={diff} title={props.title} />;
}

function findDiffOptions(
  plugins: readonly { name: string; options?: unknown }[],
): DiffPluginOptions | undefined {
  return resolvePlugins([...plugins]).find((plugin) => plugin.name === "diff")
    ?.options as DiffPluginOptions | undefined;
}
