import type { RecentPost } from "../src/recent-posts.js";

type Props = {
  posts: RecentPost[];
};

export default function RecentPosts(props: Props) {
  if (props.posts.length === 0) return null;

  return (
    <section class="rr-recent-posts" aria-labelledby="recent-posts-title">
      <div class="rr-recent-posts__header">
        <h2 class="rr-recent-posts__title" id="recent-posts-title">
          Recent Posts
        </h2>
      </div>
      <ol class="rr-recent-posts__list">
        {props.posts.map((post) => {
          const formattedDate = formatPostedDate(post.postedAt);

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

function formatPostedDate(date: Date): FormattedDate {
  const isoDate = date.toISOString();
  const displayDate = new Intl.DateTimeFormat("en-US", {
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
