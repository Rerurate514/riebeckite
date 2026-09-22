import { ContentManager, type RiebeckitePlugin } from "@riebeckite/core";
import { rehypeLightbox } from "@riebeckite/plugin-lightbox";
import { config } from "./config";
import { CONTENT_DIR } from "./constants/paths";

const plugins: RiebeckitePlugin[] = [
  {
    name: "lightbox",
    rehypePlugins: [rehypeLightbox],
  },
];

export const content = new ContentManager(CONTENT_DIR, config.content.exclude, {
  plugins,
});
