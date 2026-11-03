import { SmartNotFound } from "@riebeckite/plugin-search";
import type { Context } from "hono";

const handler = async (c: Context) => {
  c.status(404);
  return c.render(<SmartNotFound path={c.req.path} />);
};

export default handler;
