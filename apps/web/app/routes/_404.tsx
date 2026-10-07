import { config } from "virtual:riebeckite/config";
import { content } from "virtual:riebeckite/content";
import { getLanguageFromPath } from "@riebeckite/plugin-l10n";
import {
  buildSearchItems,
  findSmart404Candidates,
  searchQueryFromPath,
} from "@riebeckite/plugin-search";
import type { NotFoundHandler } from "hono";

const handler: NotFoundHandler = async (c) => {
  c.status(404);
  const manifest = await content.getManifest();
  const query = searchQueryFromPath(c.req.path);
  const candidates = findSmart404Candidates(
    buildSearchItems({ manifest, config }),
    c.req.path,
    { language: getLanguageFromPath(manifest, c.req.path) },
  );

  return c.render(
    <main class="not-found" aria-labelledby="not-found-title">
      <p class="not-found__status">404</p>
      <h1 id="not-found-title">Page not found</h1>
      <p>The page you requested is not available.</p>
      <p>
        <code>{c.req.path}</code>
      </p>
      {candidates.length > 0 ? (
        <section aria-labelledby="not-found-candidates">
          <h2 id="not-found-candidates">Maybe you were looking for</h2>
          <ul>
            {candidates.map((candidate) => (
              <li>
                <a href={candidate.permalink}>{candidate.title}</a>
                <code>{candidate.permalink}</code>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <nav class="not-found__actions" aria-label="Not found actions">
        <a href={`/?search=${encodeURIComponent(query)}`}>Search the garden</a>
        <a href="/">Go home</a>
      </nav>
    </main>,
  );
};

export default handler;
