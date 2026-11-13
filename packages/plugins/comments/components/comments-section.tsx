import { type PluginSiteComponent, resolvePlugins } from "@riebeckite/core";
import { useArticleContext, useSiteContext } from "@riebeckite/ui";
import { resolveCommentsOptions } from "../src/options.js";
import type { CommentsOptions, CommentsPage } from "../src/types.js";
import { isSafeImageUrl, isSafeLinkUrl } from "../src/url.js";

export type CommentsSectionProps = {
  readonly page: CommentsPage;
  readonly headingText?: string;
  readonly className?: string;
  readonly emptyText?: string;
};

const CommentsSection = (({
  page,
  headingText = "Comments",
  className = "rr-comments",
  emptyText = "No comments yet.",
}: Readonly<CommentsSectionProps>) => {
  return (
    <section
      class={className}
      data-rr-comments
      data-content-id={page.contentId}
      aria-label={headingText}
    >
      <h2 class="rr-comments__heading">{headingText}</h2>
      {page.comments.length === 0 ? (
        <p class="rr-comments__empty">{emptyText}</p>
      ) : (
        <ol class="rr-comments__list">
          {page.comments.map((comment) => {
            const authorUrl = isSafeLinkUrl(comment.author.url)
              ? comment.author.url
              : undefined;
            const avatarUrl = isSafeImageUrl(comment.author.avatarUrl)
              ? comment.author.avatarUrl
              : undefined;
            const commentUrl = isSafeLinkUrl(comment.url)
              ? comment.url
              : undefined;
            return (
              <li class="rr-comments__item" data-comment-id={comment.id}>
                <div class="rr-comments__meta">
                  {avatarUrl && (
                    <img
                      class="rr-comments__avatar"
                      src={avatarUrl}
                      alt=""
                      loading="lazy"
                    />
                  )}
                  {authorUrl ? (
                    <a
                      class="rr-comments__author-link"
                      href={authorUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {comment.author.name}
                    </a>
                  ) : (
                    <span class="rr-comments__author-name">
                      {comment.author.name}
                    </span>
                  )}
                  <time class="rr-comments__time" datetime={comment.createdAt}>
                    {comment.createdAt}
                  </time>
                </div>
                {commentUrl ? (
                  <a
                    class="rr-comments__body-link"
                    href={commentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {comment.body}
                  </a>
                ) : (
                  <p class="rr-comments__body">{comment.body}</p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}) satisfies PluginSiteComponent<CommentsSectionProps>;

export default CommentsSection;

export type ArticleCommentsSectionProps = Omit<CommentsSectionProps, "page">;

export async function ArticleCommentsSection(
  props: Readonly<ArticleCommentsSectionProps>,
) {
  const site = useSiteContext();
  const article = useArticleContext();
  const contentId = article?.entry?.contentId;
  if (!site || !contentId) return [];
  const options = findCommentsOptions(site.config.plugins);
  if (!options?.provider) return [];
  const resolved = resolveCommentsOptions(options);
  const page = await resolved.provider.getComments(contentId, resolved.limit);
  return (
    <CommentsSection
      page={page}
      headingText={props.headingText ?? resolved.headingText}
      className={props.className ?? resolved.className}
      emptyText={props.emptyText ?? resolved.emptyText}
    />
  );
}

function findCommentsOptions(
  plugins: readonly { name: string; options?: unknown }[],
): CommentsOptions | undefined {
  return resolvePlugins([...plugins]).find(
    (plugin) => plugin.name === "comments",
  )?.options as CommentsOptions | undefined;
}
