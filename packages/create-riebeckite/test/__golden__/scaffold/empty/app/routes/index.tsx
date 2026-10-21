import { createRoute } from "honox/factory";
import { config } from "virtual:riebeckite/config";

export default createRoute((c) =>
  c.render(
    <div class="riebeckite-empty">
      <h1>{config.site.title}</h1>
      <p>This is a blank Riebeckite site. Add Markdown files under content/ to get started.</p>
    </div>,
  ),
);
