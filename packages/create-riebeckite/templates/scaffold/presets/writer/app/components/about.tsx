import { useSiteContext } from "@riebeckite/ui";

export function SiteAbout() {
  const site = useSiteContext();
  if (!site) return null;
  const name = site.config.site.author || site.config.site.title;

  return (
    <article class="site-about">
      <header class="site-about__header">
        <p class="site-about__eyebrow">About</p>
        <img
          src="/riebeckite-logo.png"
          alt=""
          class="site-about__avatar"
          width="80"
          height="80"
        />
        <h1 class="site-about__name">{name}</h1>
        {site.config.site.description ? (
          <p class="site-about__lead">{site.config.site.description}</p>
        ) : null}
      </header>
      <div class="site-about__body">
        <p>
          I write essays about the craft of writing, editing, and publishing.
          This site collects those notes in one place, without a fixed schedule.
        </p>
        <p>
          The best place to start is the latest posts, or browse by tag if you
          are looking for a particular subject.
        </p>
      </div>
      <nav class="site-about__links" aria-label="Author links">
        <a href="/">Home</a>
        <a href="/posts">Posts</a>
        <a href="/tags">Tags</a>
        <a href="/series">Series</a>
        <a href="/feed.xml">RSS</a>
      </nav>
    </article>
  );
}
