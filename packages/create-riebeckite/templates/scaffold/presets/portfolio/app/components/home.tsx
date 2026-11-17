import { ArticleBody } from "@riebeckite/honox/ui";
import { useSiteContext } from "@riebeckite/ui";

export function SiteHome() {
  const site = useSiteContext();
  if (!site) return null;

  const projects = site.view.discoverableEntries
    .filter((entry) => entry.slug.startsWith("projects/"))
    .map((entry) => ({
      ...entry,
      summary:
        typeof entry.frontmatter.summary === "string"
          ? entry.frontmatter.summary
          : "",
    }));

  return (
    <div class="site-home">
      <div class="site-home__intro">
        <ArticleBody />
      </div>
      {projects.length > 0 ? (
        <section class="site-home__projects" aria-labelledby="selected-projects">
          <h2 id="selected-projects">Selected projects</h2>
          <ol class="site-home__project-list">
            {projects.map((project) => (
              <li class="site-home__project" key={project.slug}>
                <a href={project.permalink}>
                  <span class="site-home__project-label">Project</span>
                  <span class="site-home__project-title">{project.title}</span>
                  {project.summary ? (
                    <span class="site-home__project-summary">
                      {project.summary}
                    </span>
                  ) : null}
                </a>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
