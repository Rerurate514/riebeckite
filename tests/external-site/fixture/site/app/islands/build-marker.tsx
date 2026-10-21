import { useState } from "hono/jsx";

export default function BuildMarker() {
  const [count, setCount] = useState(0);

  return (
    <button
      type="button"
      class="fixture-build-marker"
      data-site-island-marker="RIEBECKITE_SITE_ISLAND_MARKER"
      onClick={() => setCount((current) => current + 1)}
    >
      Site-owned island: {count}
    </button>
  );
}
