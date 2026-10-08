import type { NotFoundHandler } from "hono";

const handler: NotFoundHandler = (c) => {
  c.status(404);

  return c.render(
    <div class="not-found">
      <p class="not-found__status">404</p>
      <h1>Page not found</h1>
      <p>The page you requested does not exist or is not available.</p>
      <p>
        <a href="/">Back to home</a>
      </p>
    </div>,
  );
};

export default handler;
