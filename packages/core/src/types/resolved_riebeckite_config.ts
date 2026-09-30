import type { ContentSource } from "../content/content_source.js";
import type { RiebeckitePlugin } from "./plugin.js";
import type { PublishStrategy } from "./publish_strategy.js";
import type { SiteConfig } from "./site_config.js";
import type { ThemeConfig, ThemeStyle } from "./theme_config.js";

export type ResolvedRiebeckiteConfig = {
  /**
   * Directory for build-time cache and state. Host integrations resolve this
   * relative to their application root.
   */
  buildDirectory?: string;
  site: Required<SiteConfig>;
  content: {
    directory: string;
    source?: ContentSource;
    exclude: string[];
    filters: {
      publishStrategy: PublishStrategy;
    };
  };
  markdown: {
    syntaxHighlight: {
      theme: string;
    };
  };
  theme: Required<Omit<ThemeConfig, "tokens">> & {
    tokens: NonNullable<ThemeConfig["tokens"]>;
    styles: ThemeStyle[];
  };
  plugins: RiebeckitePlugin[];
};
