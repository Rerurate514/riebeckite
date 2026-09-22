export type RecentPost = {
  slug: string;
  title: string;
  postedAt: Date;
};

type Props = {
  posts: RecentPost[];
};

export default function RecentPosts(props: Props) {
  if (props.posts.length === 0) return null;

  return (
    <section class="recent-posts" aria-labelledby="recent-posts-title">
      <div class="recent-posts__header">
        <p class="recent-posts__eyebrow">RECENT POSTS</p>
        <h2 class="recent-posts__title" id="recent-posts-title">
          最近投稿された記事
        </h2>
      </div>
      <ol class="recent-posts__list">
        {props.posts.map((post) => {
          const formattedDate = formatPostedDate(post.postedAt);

          return (
            <li class="recent-posts__item" key={post.slug}>
              <a class="recent-posts__link" href={`/${post.slug}`}>
                <time
                  class="recent-posts__date"
                  dateTime={formattedDate.isoDate}
                  title={formattedDate.fullDate}
                >
                  {formattedDate.displayDate}
                </time>
                <span class="recent-posts__post-title">{post.title}</span>
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
  const displayDate = new Intl.DateTimeFormat("ja-JP", {
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
