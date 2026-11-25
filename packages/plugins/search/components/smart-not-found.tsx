import { useSiteContext, useUiLabels } from "@riebeckite/ui";
import { searchLabels } from "../src/labels.js";
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
  title,
  description,
  candidatesHeading,
  searchLabel,
  homeLabel,
}: SmartNotFoundProps) {
  const site = useSiteContext();
  const labels = useUiLabels(searchLabels);
  const requestPath = path ?? site?.path ?? "/";
  const query = searchQueryFromPath(requestPath);
  const candidates = site
    ? findSmart404Candidates(
        buildSearchItems({ manifest: site.manifest, config: site.config }),
        requestPath,
        { language: site.language },
      )
    : [];

  const notFoundActions = labels.notFoundActions;

  return (
    <div class="rr-search-not-found">
      <p class="rr-search-not-found__status">404</p>
      <h1 id="search-not-found-title">{title ?? labels.notFound}</h1>
      <p>{description ?? labels.notFoundDescription}</p>
      <p>
        <code>{requestPath}</code>
      </p>
      {candidates.length > 0 ? (
        <section aria-labelledby="search-not-found-candidates">
          <h2 id="search-not-found-candidates">
            {candidatesHeading ?? labels.candidatesHeading}
          </h2>
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
      <nav class="rr-search-not-found__actions" aria-label={notFoundActions}>
        <a href={`${searchHref}?search=${encodeURIComponent(query)}`}>
          {searchLabel ?? labels.searchLabel}
        </a>
        <a href={homeHref}>{homeLabel ?? labels.homeLabel}</a>
      </nav>
    </div>
  );
}
