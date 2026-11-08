import type { CommentsPage } from "../src/types.js";
import { isSafeImageUrl, isSafeLinkUrl } from "../src/url.js";

export type CommentsSectionProps = {
  page: CommentsPage;
  headingText?: string;
  className?: string;
  emptyText?: string;
};

export default function CommentsSection({
  page,
  headingText = "Comments",
  className = "rr-comments",
  emptyText = "No comments yet.",
}: CommentsSectionProps) {
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
}
