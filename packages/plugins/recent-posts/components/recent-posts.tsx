import { useSiteContext } from "@riebeckite/ui";
import { html } from "hono/html";
import type { RecentPost } from "../src/recent-posts.js";
import { getRecentPosts } from "../src/recent-posts.server.js";

type Props = {
  posts?: RecentPost[];
  title?: string;
  locale?: string;
  variant?: "default" | "compact";
};

export default async function RecentPosts(props: Props) {
  const site = useSiteContext();
  const posts =
    props.posts ??
    (site ? await getRecentPosts({ manifest: site.manifest }) : []);
  if (posts.length === 0) return html``;
  const variant = props.variant ?? "default";

  return (
    <section
      class={`rr-recent-posts rr-recent-posts--${variant}`}
      aria-labelledby="recent-posts-title"
    >
      <div class="rr-recent-posts__header">
        <h2 class="rr-recent-posts__title" id="recent-posts-title">
          {props.title ?? "Recent Posts"}
        </h2>
      </div>
      <ol class="rr-recent-posts__list">
        {posts.map((post) => {
          const formattedDate = formatPostedDate(
            post.postedAt,
            props.locale ?? "en-US",
          );

          return (
            <li class="rr-recent-posts__item" key={post.slug}>
              <a class="rr-recent-posts__link" href={post.permalink}>
                <time
                  class="rr-recent-posts__date"
                  dateTime={formattedDate.isoDate}
                  title={formattedDate.fullDate}
                >
                  {formattedDate.displayDate}
                </time>
                <span class="rr-recent-posts__post-title">{post.title}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

type FormattedDate = {
  displayDate: string;
  fullDate: string;
  isoDate: string;
};

function formatPostedDate(date: Date, locale: string): FormattedDate {
  const isoDate = date.toISOString();
  const displayDate = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  return {
    displayDate,
    fullDate: isoDate,
    isoDate,
  };
}
