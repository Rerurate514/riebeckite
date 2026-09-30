import { resolveContentRoute } from "@riebeckite/honox/server";
import { createRoute } from "honox/factory";
import { content } from "../content";

const ALIAS_PATH = "/alias-demo-legacy";

export default createRoute(async (c) => {
  const manifest = await content.getManifest();
  const route = resolveContentRoute(manifest, ALIAS_PATH);
  const kind = route?.kind ?? "missing";
  const target = route?.kind === "redirect" ? route.location : "";

  return c.render(
    <main>
      <p>
        RIEBECKITE_EXTERNAL_ALIAS_MARKER kind={kind} target={target}
      </p>
    </main>,
  );
});
