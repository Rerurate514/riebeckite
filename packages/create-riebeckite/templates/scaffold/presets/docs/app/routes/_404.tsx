import type { Context } from "hono";
import { ContentContainer, ShellBody, ShellHeader, ShellMain, SiteShell } from "@riebeckite/shell-ui";
import { SiteHeader } from "../components/site-header";

const handler = (c: Context) => {
  c.status(404);

  return c.render(
    <SiteShell>
      <ShellHeader sticky>
        <SiteHeader />
      </ShellHeader>
      <ShellBody>
        <ShellMain id="main-content" tabindex={-1}>
          <ContentContainer>
            <div class="not-found">
              <p class="not-found__status">404</p>
              <h1>Page not found</h1>
              <p>The page you requested does not exist or is not available.</p>
              <p>
                <a href="/">Back to home</a>
              </p>
            </div>
          </ContentContainer>
        </ShellMain>
      </ShellBody>
    </SiteShell>,
  );
};

export default handler;
