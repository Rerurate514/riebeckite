import { useSiteContext } from "@riebeckite/ui";
import { findSmart404Candidates, searchQueryFromPath } from "../src/search.js";
import { buildSearchItems } from "../src/search-index.server.js";

export type SmartNotFoundProps = {
  readonly path?: string;
  readonly homeHref?: string;
  readonly searchHref?: string;
  readonly title?: string;
  readonly description?: string;
  readonly candidatesHeading?: string;
  readonly searchLabel?: string;
  readonly homeLabel?: string;
};

export default function SmartNotFound({
  path,
  homeHref = "/",
  searchHref = "/",
  title = "Page not found",
  description = "The page you requested is not available.",
  candidatesHeading = "Maybe you were looking for",
  searchLabel = "Search the garden",
  homeLabel = "Go home",
}: SmartNotFoundProps) {
  const site = useSiteContext();
  const requestPath = path ?? site?.path ?? "/";
  const query = searchQueryFromPath(requestPath);
  const candidates = site
    ? findSmart404Candidates(
        buildSearchItems({ manifest: site.manifest, config: site.config }),
        requestPath,
        { language: site.language },
      )
    : [];

  return (
    <div class="rr-search-not-found">
      <p class="rr-search-not-found__status">404</p>
      <h1 id="search-not-found-title">{title}</h1>
      <p>{description}</p>
      <p>
        <code>{requestPath}</code>
      </p>
      {candidates.length > 0 ? (
        <section aria-labelledby="search-not-found-candidates">
          <h2 id="search-not-found-candidates">{candidatesHeading}</h2>
          <ul>
            {candidates.map((candidate) => (
              <li key={candidate.permalink}>
                <a href={candidate.permalink}>{candidate.title}</a>
                <code>{candidate.permalink}</code>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <nav class="rr-search-not-found__actions" aria-label="Not found actions">
        <a href={`${searchHref}?search=${encodeURIComponent(query)}`}>
          {searchLabel}
        </a>
        <a href={homeHref}>{homeLabel}</a>
      </nav>
    </div>
  );
}
