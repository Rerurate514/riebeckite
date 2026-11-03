import { createRoute } from "honox/factory";
import { config } from "virtual:riebeckite/config";

export default createRoute((c) =>
  c.render(
    <div class="riebeckite-empty">
      <h1>{config.site.title}</h1>
      <p>This is a blank Riebeckite site. Add a theme and plugins in riebeckite.config.ts to get started.</p>
    </div>,
  ),
);
