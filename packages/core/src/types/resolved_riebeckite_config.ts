import type { ContentSource } from "../content/content_source.js";
import type { ResolvedPublicationConfig } from "../publication/config.js";
import type { RiebeckitePlugin } from "./plugin.js";
import type { PublishStrategy } from "./publish_strategy.js";
import type { SpaConfig } from "./riebeckite_config.js";
import type { SiteConfig } from "./site_config.js";
import type { ResolvedTheme } from "./theme_config.js";

export type ResolvedRiebeckiteConfig = {
  /**
   * Directory for build-time cache and state. Host integrations resolve this
   * relative to their application root.
   */
  buildDirectory?: string;
  /**
   * Directory for the built site. Host integrations resolve this relative to
   * their application root.
   */
  outputDirectory?: string;
  site: Omit<Required<SiteConfig>, "feed"> & {
    feed: {
      title: string;
      description: string;
      language: string;
    };
  };
  content: {
    directory: string;
    source?: ContentSource;
    exclude: string[];
    filters: {
      publishStrategy: PublishStrategy;
    };
  };
  theme: ResolvedTheme;
  plugins: RiebeckitePlugin[];
  pluginInventory?: readonly import("./plugin.js").ResolvedPluginMetadata[];
  cache: {
    enabled: boolean;
    directory: string;
  };
  provenance: {
    enabled: boolean;
  };
  publication?: ResolvedPublicationConfig;
  spa?: SpaConfig;
};
