import type { Context } from "hono";
import { SiteHeader } from "../components/site-header";

const handler = (c: Context) => {
  c.status(404);

  return c.render(
    <div class="site-shell">
      <SiteHeader />
      <main id="main-content" tabindex={-1} class="site-main">
        <div class="site-content">
            <div class="not-found">
              <p class="not-found__status">404</p>
              <h1>Page not found</h1>
              <p>The page you requested does not exist or is not available.</p>
              <p>
                <a href="/">Back to home</a>
              </p>
            </div>
        </div>
      </main>
    </div>,
  );
};

export default handler;
