import { createRoute } from "honox/factory";
import { config } from "virtual:riebeckite/config";

export default createRoute((c) =>
  c.render(
    <div class="riebeckite-empty">
      <img
        src="/riebeckite-logo.png"
        alt=""
        class="riebeckite-empty__logo"
        width="40"
        height="40"
      />
      <p class="riebeckite-empty__label">Blank site</p>
      <h1>{config.site.title}</h1>
      <p class="riebeckite-empty__body">
        This is a blank Riebeckite site. Add a theme and plugins in{" "}
        <code>riebeckite.config.ts</code> to get started.
      </p>
    </div>,
  ),
);
